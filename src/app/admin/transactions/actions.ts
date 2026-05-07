"use server";

import { supabaseAdmin } from "@/lib/auth-server";

export async function getLatestTransactions() {
  const { data: transactionsRaw } = await supabaseAdmin
    .from("transactions")
    .select("*, users(phone)")
    .order("created_at", { ascending: false })
    .limit(30);

  return transactionsRaw?.map(tx => ({
    ...tx,
    phone: tx.phone || tx.users?.phone || 'Desconhecido'
  })) || [];
}

export async function getMoreTransactions(offset: number) {
  const { data: transactionsRaw } = await supabaseAdmin
    .from("transactions")
    .select("*, users(phone)")
    .order("created_at", { ascending: false })
    .range(offset, offset + 29);

  return transactionsRaw?.map(tx => ({
    ...tx,
    phone: tx.phone || tx.users?.phone || 'Desconhecido'
  })) || [];
}

export async function forceApproveDeposit(txId: string) {
  try {
    const { data: tx } = await supabaseAdmin.from("transactions").select("*").eq("id", txId).single();
    if (!tx || tx.type !== "DEPOSIT" || tx.status === "COMPLETED") {
      return { success: false, error: "Transação inválida ou já aprovada." };
    }

    // 1. Marcar como COMPLETED
    await supabaseAdmin.from("transactions").update({ status: "COMPLETED" }).eq("id", txId);

    // 2. Processar saldo e bónus corretamente
    const numAmount = Number(tx.amount);
    const { data: user } = await supabaseAdmin.from("users").select("balance, bonus_balance, has_deposited").eq("id", tx.user_id).single();
    
    if (user) {
      const finalBalance = Number(user.balance) + numAmount;
      let newBonusBalance = Number(user.bonus_balance || 0);
      let bonus = 0;
      
      if (!user.has_deposited) {
        bonus = Math.min(numAmount * 5, 25000);
        newBonusBalance += bonus;
        
        await supabaseAdmin.from('notifications').insert({
          user_id: tx.user_id,
          message: `Acaba de receber ${bonus.toFixed(2)} MZN de Bónus no seu primeiro depósito!`,
          type: "promo"
        });
      }
      
      await supabaseAdmin.from("users").update({
        balance: finalBalance,
        ...(bonus > 0 && { bonus_balance: newBonusBalance }),
        has_deposited: true
      }).eq("id", tx.user_id);

      await supabaseAdmin.from('notifications').insert({
        user_id: tx.user_id,
        message: `O seu depósito de ${numAmount.toFixed(2)} MZN (ID: ${tx.id.split('-')[0]}) foi aprovado com sucesso!`,
        type: "deposit_success"
      });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro desconhecido" };
  }
}
