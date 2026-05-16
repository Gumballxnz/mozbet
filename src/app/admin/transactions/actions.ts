"use server";

import { supabaseAdmin } from "@/lib/auth-server";
import { checkDebitoPayStatus } from "@/lib/debitopay";

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

/**
 * Reconcilia todas as transações PENDENTES com a API da Debito Pay.
 * Para cada transação que tenha provider_reference, consulta o estado real
 * e aprova ou marca como falha automaticamente.
 */
export async function reconcilePendingTransactions() {
  try {
    // Buscar transações PENDING do tipo DEPOSIT das últimas 72 horas
    const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

    const { data: pendingTxs, error: fetchError } = await supabaseAdmin
      .from("transactions")
      .select("id, provider_reference, amount, user_id, created_at")
      .eq("status", "PENDING")
      .eq("type", "DEPOSIT")
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    if (fetchError || !pendingTxs) {
      console.error("[Reconciliação] Erro ao buscar pendentes:", fetchError);
      return { checked: 0, approved: 0, failed: 0, skipped: 0, error: fetchError?.message };
    }

    let approved = 0;
    let failed = 0;
    let skipped = 0;

    for (const tx of pendingTxs) {
      // Se não tiver provider_reference, não podemos verificar na DebitoPay
      if (!tx.provider_reference) {
        skipped++;
        continue;
      }

      try {
        const result = await checkDebitoPayStatus(tx.provider_reference);

        if (!result.success) {
          console.warn(`[Reconciliação] Erro ao verificar tx ${tx.id}:`, result.error);
          skipped++;
          continue;
        }

        if (result.status === "success") {
          // O pagamento foi confirmado na DebitoPay! Aprovar no nosso sistema.
          const approveRes = await forceApproveDeposit(tx.id);
          if (approveRes.success) {
            approved++;
            console.log(`[Reconciliação] ✅ TX ${tx.id} aprovada (${tx.amount} MZN)`);
          } else {
            console.warn(`[Reconciliação] Erro ao aprovar TX ${tx.id}:`, approveRes.error);
            skipped++;
          }
        } else if (result.status === "failed" || result.status === "expired") {
          // Pagamento falhou ou expirou
          await supabaseAdmin.from("transactions").update({ status: "FAILED" }).eq("id", tx.id);
          failed++;
          console.log(`[Reconciliação] ❌ TX ${tx.id} marcada como FAILED`);
        } else {
          // Ainda pending na DebitoPay — não fazemos nada
          skipped++;
        }

        // Pequena pausa entre chamadas para não sobrecarregar a API
        await new Promise(r => setTimeout(r, 300));
      } catch (err: any) {
        console.error(`[Reconciliação] Exceção na TX ${tx.id}:`, err.message);
        skipped++;
      }
    }

    console.log(`[Reconciliação] Concluída: ${pendingTxs.length} verificadas, ${approved} aprovadas, ${failed} falhadas, ${skipped} ignoradas`);
    return { checked: pendingTxs.length, approved, failed, skipped };
  } catch (err: any) {
    console.error("[Reconciliação] Erro geral:", err.message);
    return { checked: 0, approved: 0, failed: 0, skipped: 0, error: err.message };
  }
}

