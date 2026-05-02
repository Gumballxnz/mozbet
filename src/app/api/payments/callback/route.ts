import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";

// Endpoint para a e2Payments (Webhook) avisar se o M-Pesa foi pago ou falhou
export async function POST(req: Request) {
  try {
    const data = await req.json();

    // A e2Payments normalmente envia a reference (o nosso transaction.id), amount, status, etc.
    // Exemplo de payload esperado: { reference: "...", status: "COMPLETED" | "FAILED", amount: 100 }
    const { reference, status } = data;

    if (!reference) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    // 1. Buscar a transação pendente
    const { data: transaction } = await supabaseAdmin
      .from("transactions")
      .select("*, users(phone, balance, has_deposited)")
      .eq("id", reference)
      .single();

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Prevenir processamento duplo
    if (transaction.status !== "PENDING") {
      return NextResponse.json({ message: "Transaction already processed" }, { status: 200 });
    }

    // 2. Se a transação falhou no M-pesa
    if (status === "FAILED") {
      await supabaseAdmin.from("transactions").update({ status: "FAILED" }).eq("id", reference);
      
      await supabaseAdmin.from('notifications').insert({
        user_id: transaction.user_id,
        message: `Falha no depósito de ${Number(transaction.amount).toFixed(2)} MZN. Verifique o seu saldo no M-Pesa ou PIN e tente novamente.`,
        type: "deposit_failed"
      });
      
      return NextResponse.json({ success: true });
    }

    // 3. Se a transação foi SUCESSO no M-pesa
    if (status === "COMPLETED" || status === "SUCCESS") {
      const numAmount = Number(transaction.amount);
      
      // Atualiza estado
      await supabaseAdmin.from("transactions").update({ status: "COMPLETED" }).eq("id", reference);
      
      // Notifica Sucesso
      await supabaseAdmin.from('notifications').insert({
        user_id: transaction.user_id,
        message: `O seu depósito de ${numAmount.toFixed(2)} MZN foi aprovado com sucesso! Boas apostas.`,
        type: "deposit_success"
      });
      
      // Atualizar saldo
      const user = transaction.users;
      if (user) {
        let finalBalance = Number(user.balance) + numAmount;
        
        // Bónus de primeiro depósito
        if (!user.has_deposited) {
          const bonus = Math.min(numAmount * 5, 25000);
          finalBalance += bonus;
          
          await supabaseAdmin.from("transactions").insert([{
            user_id: transaction.user_id, type: "BONUS", amount: bonus, status: "COMPLETED", phone: user.phone
          }]);
          
          await supabaseAdmin.from('notifications').insert({
            user_id: transaction.user_id,
            message: `Acaba de receber ${bonus.toFixed(2)} MZN de Bónus no seu primeiro depósito!`,
            type: "promo"
          });
        }
        
        await supabaseAdmin.from("users").update({
          balance: finalBalance,
          has_deposited: true
        }).eq("id", transaction.user_id);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ message: "Ignored status" }, { status: 200 });

  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
