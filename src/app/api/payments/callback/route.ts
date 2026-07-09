import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature") || "";
    
    // Suportar segredo de webhook com grafia DEBITOPAY e DEBITIPAY
    const webhookSecret = process.env.DEBITOPAY_WEBHOOK_SECRET || process.env.DEBITIPAY_WEBHOOK_SECRET;

    // 1. Validar assinatura do webhook se configurada no .env
    if (webhookSecret) {
      const hash = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
      if (hash !== signature) {
        console.error("[DebitoPay Webhook] Assinatura inválida!");
        return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    console.log("[DebitoPay Webhook] Evento recebido:", payload.event, "Payment ID:", payload.data?.payment_id);

    // 2. Tratar apenas transações de sucesso
    if (payload.event === "payment.completed") {
      const { payment_id, amount } = payload.data;

      if (!payment_id) {
        return NextResponse.json({ error: "payment_id não fornecido no payload" }, { status: 400 });
      }

      // 3. Buscar a transação no banco usando o payment_id gravado no campo reference
      const { data: transaction, error: fetchTxError } = await supabaseAdmin
        .from("transactions")
        .select("*")
        .eq("reference", payment_id)
        .single();

      if (fetchTxError || !transaction) {
        console.warn("[DebitoPay Webhook] Transação não encontrada no banco com reference:", payment_id);
        return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
      }

      // Se a transação já foi processada (evitar duplicados)
      if (transaction.status === "COMPLETED") {
        console.log("[DebitoPay Webhook] Transação já estava aprovada:", transaction.id);
        return NextResponse.json({ success: true, message: "Já processado" });
      }

      const numAmount = Number(amount || transaction.amount);

      // 4. Atualizar transação de depósito para COMPLETED no banco
      await supabaseAdmin
        .from("transactions")
        .update({ status: "COMPLETED", updated_at: new Date().toISOString() })
        .eq("id", transaction.id);

      // 5. Enviar Notificação no Telegram
      try {
        const { sendTelegramNotification } = await import("@/lib/telegram");
        const message = `venda aprovada!\nvalor: ${numAmount}MT\nOrigem: Mozbet`;
        sendTelegramNotification(message).catch((err) =>
          console.error("Falha assíncrona ao enviar notificação Telegram:", err)
        );
      } catch (telegramErr) {
        console.error("Erro ao importar ou iniciar notificação do Telegram:", telegramErr);
      }

      // Registrar comissão de afiliado (50% do depósito)
      try {
        const { registerAffiliateActivity } = await import("@/lib/affiliate");
        await registerAffiliateActivity(transaction.user_id, "DEPOSIT", numAmount, transaction.id);
      } catch (affErr) {
        console.error("Erro ao processar comissão de afiliado no webhook:", affErr);
      }

      // 6. Notificação de sucesso do depósito para o usuário
      await supabaseAdmin.from('notifications').insert({
        user_id: transaction.user_id,
        message: `O seu depósito de ${numAmount.toFixed(2)} MZN foi aprovado com sucesso via telemóvel e creditado na sua conta. Boas apostas!`,
        type: "deposit_success"
      });

      // 7. Buscar configurações de bónus do banco
      let bonusPercent = 500;
      try {
        const { data: settings } = await supabaseAdmin
          .from("settings")
          .select("key, value");
        if (settings) {
          const bonusSetting = settings.find(s => s.key === "first_deposit_bonus_percent");
          if (bonusSetting) bonusPercent = Number(bonusSetting.value);
        }
      } catch (err) {
        console.error("[DebitoPay Webhook] Erro ao buscar configurações de bónus, usando fallback.");
      }

      // 8. Buscar os dados do utilizador
      const { data: user } = await supabaseAdmin
        .from("users")
        .select("balance, bonus_balance, has_deposited")
        .eq("id", transaction.user_id)
        .single();

      if (user) {
        const newBalance = Number(user.balance) + numAmount;
        let newBonusBalance = Number(user.bonus_balance || 0);
        let bonus = 0;

        // Aplica o Bónus se for o 1º depósito
        if (!user.has_deposited) {
          const multiplier = bonusPercent / 100;
          bonus = numAmount * multiplier;
          newBonusBalance += bonus;

          // Inserir registro do bónus nas transações
          await supabaseAdmin.from("transactions").insert([{
            user_id: transaction.user_id,
            type: "BONUS",
            amount: bonus,
            status: "COMPLETED",
            phone: transaction.phone
          }]);

          // Notificação de bónus para o usuário
          await supabaseAdmin.from('notifications').insert({
            user_id: transaction.user_id,
            message: `Acaba de receber ${bonus.toFixed(2)} MZN de Bónus (${bonusPercent}%) no seu primeiro depósito!`,
            type: "promo"
          });
        }

        // Atualizar o saldo real, bónus e flag de depósito do usuário no banco
        await supabaseAdmin.from("users").update({
          balance: newBalance,
          bonus_balance: newBonusBalance,
          has_deposited: true
        }).eq("id", transaction.user_id);
      }

      console.log("[DebitoPay Webhook] Transação finalizada com sucesso:", transaction.id);
      return NextResponse.json({ success: true, message: "Depósito completado com sucesso" });
    }

    if (payload.event === "payment.failed") {
      const { payment_id } = payload.data;
      if (payment_id) {
        // Atualizar transação de depósito para FAILED
        const { data: transaction } = await supabaseAdmin
          .from("transactions")
          .update({ status: "FAILED", updated_at: new Date().toISOString() })
          .eq("reference", payment_id)
          .select("id, user_id, amount")
          .single();

        if (transaction) {
          // Enviar notificação de falha para o usuário
          await supabaseAdmin.from('notifications').insert({
            user_id: transaction.user_id,
            message: `O seu depósito de ${Number(transaction.amount).toFixed(2)} MZN foi cancelado ou falhou no telemóvel.`,
            type: "deposit_failed"
          });
        }
      }
      return NextResponse.json({ success: true, message: "Falha registrada" });
    }

    return NextResponse.json({ success: true, message: "Evento ignorado" });
  } catch (error) {
    console.error("Erro no processamento do webhook:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
