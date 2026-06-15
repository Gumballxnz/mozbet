import { NextResponse } from "next/server";
import { verifyToken, supabaseAdmin } from "@/lib/auth-server";
import { processE2Payment, type E2PaymentMethod } from "@/lib/e2payments";

export const maxDuration = 60; // Permite timeout de até 60 segundos na Vercel

export async function POST(req: Request) {
  try {
    // 1. Verificar se o utilizador está logado (segurança)
    const cookieHeader = req.headers.get("cookie");
    const sessionCookie = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("mozbet_session="));
    
    const token = sessionCookie?.split("=")[1];

    if (!token) {
      return NextResponse.json({ error: "Sessão expirada. Faça login novamente." }, { status: 401 });
    }

    const decoded = await verifyToken<{ id: string; phone: string; is_admin: boolean; }>(token);
    if (!decoded) {
      return NextResponse.json({ error: "Token inválido." }, { status: 401 });
    }

    // 2. Extrair valor, método de pagamento e validar
    const { amount, method = "mpesa", acceptBonus = true } = await req.json();
    const numAmount = Number(amount);
    const paymentMethod: E2PaymentMethod = method === "emola" ? "emola" : "mpesa";

    // Carregar limites e bónus do banco de dados (settings)
    let minDeposit = 10;
    let maxDeposit = 17500;
    let bonusPercent = 500;
    try {
      const { data: settings } = await supabaseAdmin
        .from("settings")
        .select("key, value");

      if (settings) {
        const minSetting = settings.find(s => s.key === "min_deposit");
        const maxSetting = settings.find(s => s.key === "max_deposit");
        const bonusSetting = settings.find(s => s.key === "first_deposit_bonus_percent");

        if (minSetting) minDeposit = Number(minSetting.value);
        if (maxSetting) maxDeposit = Number(maxSetting.value);
        if (bonusSetting) bonusPercent = Number(bonusSetting.value);
      }
    } catch (err) {
      console.error("[API Deposit] Erro ao buscar configurações do banco, usando fallbacks.");
    }

    if (isNaN(numAmount) || numAmount < minDeposit || numAmount > maxDeposit) {
      return NextResponse.json({ error: `O valor mínimo de depósito é ${minDeposit} MZN e o máximo é ${maxDeposit.toLocaleString("pt-MZ")} MZN.` }, { status: 400 });
    }

    // 3. Criar o registo da transação como PENDENTE no Banco de Dados
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("transactions")
      .insert([
        {
          user_id: decoded.id,
          type: "DEPOSIT",
          amount: numAmount,
          status: "PENDING",
          phone: decoded.phone,
        }
      ])
      .select("id")
      .single();

    if (txError || !transaction) {
      console.error("Erro ao criar transação:", txError);
      return NextResponse.json({ error: "Erro interno ao iniciar depósito." }, { status: 500 });
    }

    const hasKeys = !!process.env.E2PAY_CLIENT_ID;
    
    // Em produção, nunca permitir o modo simulação se as chaves estiverem em falta
    if (!hasKeys && process.env.NODE_ENV === "production") {
      await supabaseAdmin.from("transactions").update({ status: "FAILED" }).eq("id", transaction.id);
      return NextResponse.json(
        { error: "Sistema de pagamento temporariamente indisponível." },
        { status: 503 }
      );
    }
    
    // MODO SIMULAÇÃO RÁPIDO (Apenas para o teste falho de 2MT em dev/testes)
    if (!hasKeys && numAmount === 2) {
      await supabaseAdmin.from("transactions").update({ status: "FAILED" }).eq("id", transaction.id);
      
      await supabaseAdmin.from('notifications').insert({
        user_id: decoded.id,
        message: `Falha no depósito de ${numAmount.toFixed(2)} MZN: Saldo insuficiente no M-pesa ou PIN incorreto. Tente novamente.`,
        type: "deposit_failed"
      });
      
      return NextResponse.json({ error: "Falha simulada no M-pesa (Depósito de 2MT)." }, { status: 400 });
    }

    let paymentSuccess = false;
    let errorMessage = "Ocorreu um erro no processamento do depósito.";

    if (hasKeys) {
      // ===== MODO E2PAYMENTS — PAGAMENTO REAL E INSTANTÂNEO =====
      const e2payRes = await processE2Payment(decoded.phone, numAmount, transaction.id, paymentMethod);
      if (e2payRes.success) {
        paymentSuccess = true;
      } else {
        errorMessage = e2payRes.error || "Pagamento rejeitado pelo gateway.";
      }
    } else {
      // ===== MODO DESENVOLVIMENTO / TESTES =====
      // Apenas simulamos um pequeno atraso de 1.5s e aprovamos
      await new Promise(resolve => setTimeout(resolve, 1500));
      paymentSuccess = true;
    }

    if (!paymentSuccess) {
      // Registrar falha no banco de dados
      await supabaseAdmin.from("transactions").update({ status: "FAILED" }).eq("id", transaction.id);
      
      // Notificação de falha para o usuário (evita duplicar "Tente novamente")
      const formattedErrorMessage = errorMessage.endsWith("Tente novamente.")
        ? errorMessage
        : `${errorMessage} Tente novamente.`;

      await supabaseAdmin.from('notifications').insert({
        user_id: decoded.id,
        message: `Falha no depósito de ${numAmount.toFixed(2)} MZN: ${formattedErrorMessage}`,
        type: "deposit_failed"
      });

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // ===== PROCESSO DE SUCESSO UNIFICADO (Saldo Real + Bónus Real) =====
    // 1. Atualizar transação de depósito para COMPLETED
    await supabaseAdmin.from("transactions").update({ status: "COMPLETED" }).eq("id", transaction.id);

    // Registrar comissão de afiliado (50% do depósito)
    try {
      const { registerAffiliateActivity } = await import("@/lib/affiliate");
      await registerAffiliateActivity(decoded.id, "DEPOSIT", numAmount, transaction.id);
    } catch (affErr) {
      console.error("Erro ao processar comissão de afiliado para depósito:", affErr);
    }

    // 2. Notificação de sucesso do depósito
    await supabaseAdmin.from('notifications').insert({
      user_id: decoded.id,
      message: `O seu depósito de ${numAmount.toFixed(2)} MZN foi aprovado com sucesso e creditado na sua conta. Boas apostas!`,
      type: "deposit_success"
    });

    // 3. Buscar os dados do utilizador
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("balance, bonus_balance, has_deposited")
      .eq("id", decoded.id)
      .single();

    let newBalance = numAmount;
    let newBonusBalance = 0;

    if (user) {
      newBalance = Number(user.balance) + numAmount;
      newBonusBalance = Number(user.bonus_balance || 0);
      let bonus = 0;

      // Aplica o Bónus se for o 1º depósito (500% ou dinâmico) e se foi aceito
      if (!user.has_deposited && acceptBonus) {
        const multiplier = bonusPercent / 100;
        bonus = numAmount * multiplier; // bónus real entregue de facto
        newBonusBalance += bonus;

        // Inserir registro do bónus nas transações
        await supabaseAdmin.from("transactions").insert([{
          user_id: decoded.id,
          type: "BONUS",
          amount: bonus,
          status: "COMPLETED",
          phone: decoded.phone
        }]);

        // Notificação de bónus para o usuário
        await supabaseAdmin.from('notifications').insert({
          user_id: decoded.id,
          message: `Acaba de receber ${bonus.toFixed(2)} MZN de Bónus (${bonusPercent}%) no seu primeiro depósito!`,
          type: "promo"
        });
      }

      // Atualizar o saldo real, bónus e flag de depósito do usuário no banco
      await supabaseAdmin.from("users").update({
        balance: newBalance,
        bonus_balance: newBonusBalance,
        has_deposited: true
      }).eq("id", decoded.id);
    }

    return NextResponse.json({
      success: true,
      status: "COMPLETED",
      message: "Depósito concluído com sucesso!",
      newBalance,
      transactionId: transaction.id
    }, { status: 200 });

  } catch (error) {
    console.error("Erro na API de depósito:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
