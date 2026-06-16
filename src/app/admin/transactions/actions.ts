"use server";

import { supabaseAdmin } from "@/lib/auth-server";
import { Resend } from "resend";

export async function cleanupPendingDeposits() {
  try {
    const threeMinutesAgo = new Date();
    threeMinutesAgo.setMinutes(threeMinutesAgo.getMinutes() - 3);
    const threeMinutesAgoISO = threeMinutesAgo.toISOString();

    const { error } = await supabaseAdmin
      .from("transactions")
      .update({ status: "FAILED" })
      .eq("type", "DEPOSIT")
      .eq("status", "PENDING")
      .lt("created_at", threeMinutesAgoISO);

    if (error) {
      console.error("Erro no update de limpeza de pendentes:", error);
    }
  } catch (err) {
    console.error("Erro ao limpar depósitos pendentes antigos:", err);
  }
}

export async function getLatestTransactions(typeFilter?: "DEPOSIT" | "WITHDRAW") {
  // Limpar transações expiradas antes de listar
  await cleanupPendingDeposits();

  let query = supabaseAdmin
    .from("transactions")
    .select("*, users(phone)");

  if (typeFilter === "DEPOSIT") {
    query = query.in("type", ["DEPOSIT", "BONUS"]);
  } else if (typeFilter === "WITHDRAW") {
    query = query.eq("type", "WITHDRAW");
  }

  const { data: transactionsRaw } = await query
    .order("created_at", { ascending: false })
    .limit(30);

  return transactionsRaw?.map(tx => ({
    ...tx,
    phone: tx.phone || tx.users?.phone || 'Desconhecido'
  })) || [];
}

export async function getMoreTransactions(offset: number, typeFilter?: "DEPOSIT" | "WITHDRAW") {
  // Limpar transações expiradas antes de listar mais
  await cleanupPendingDeposits();

  let query = supabaseAdmin
    .from("transactions")
    .select("*, users(phone)");

  if (typeFilter === "DEPOSIT") {
    query = query.in("type", ["DEPOSIT", "BONUS"]);
  } else if (typeFilter === "WITHDRAW") {
    query = query.eq("type", "WITHDRAW");
  }

  const { data: transactionsRaw } = await query
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

export async function approveWithdraw(txId: string) {
  try {
    const { data: tx } = await supabaseAdmin
      .from("transactions")
      .select("*, users(email)")
      .eq("id", txId)
      .single();

    if (!tx || tx.type !== "WITHDRAW" || tx.status !== "PENDING") {
      return { success: false, error: "Transação inválida ou já processada." };
    }

    // 1. Atualizar transação para COMPLETED
    await supabaseAdmin.from("transactions").update({ status: "COMPLETED" }).eq("id", txId);

    // 2. Notificação de sucesso do levantamento (com aviso de até 48 horas)
    const msg = `O seu pedido de levantamento de ${Number(tx.amount).toFixed(2)} MZN foi aprovado e processado com sucesso! O valor será creditado na sua conta cadastrada em até 48 horas.`;
    await supabaseAdmin.from('notifications').insert({
      user_id: tx.user_id,
      message: msg,
      type: "deposit_success"
    });

    // 3. Enviar e-mail de aviso se o utilizador possuir e-mail cadastrado
    const email = Array.isArray(tx.users) ? (tx.users[0] as any)?.email : (tx.users as any)?.email;
    if (email) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");
        await resend.emails.send({
          from: "MozBet <suporte@mozbet.online>",
          to: [email],
          subject: "Levantamento Aprovado - MozBet",
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; background-color: #0f172a; color: white; padding: 40px; border-radius: 20px;">
              <h1 style="color: #00FF7F; text-align: center;">Levantamento Aprovado</h1>
              <p>Olá,</p>
              <p>O seu pedido de levantamento no valor de <strong>${Number(tx.amount).toFixed(2)} MZN</strong> foi aprovado e processado com sucesso.</p>
              <div style="background-color: #1e293b; padding: 20px; border-radius: 12px; text-align: center; margin: 30px 0; border: 1px solid #00FF7F;">
                <span style="font-size: 18px; font-weight: bold; color: #00FF7F;">Status: Aprovado (Até 48 horas)</span>
              </div>
              <p>O valor será creditado na sua conta móvel (M-Pesa / e-Mola) cadastrada no sistema em um prazo máximo de <strong>48 horas</strong>.</p>
              <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 30px;">Obrigado por escolher a MozBet!</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Erro ao enviar e-mail de saque aprovado:", emailErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao aprovar saque" };
  }
}

export async function rejectWithdraw(txId: string) {
  try {
    const { data: tx } = await supabaseAdmin.from("transactions").select("*").eq("id", txId).single();
    if (!tx || tx.type !== "WITHDRAW" || tx.status !== "PENDING") {
      return { success: false, error: "Transação inválida ou já processada." };
    }

    // 1. Atualizar transação para FAILED
    await supabaseAdmin.from("transactions").update({ status: "FAILED" }).eq("id", txId);

    // 2. Devolver saldo ao utilizador
    const { data: user } = await supabaseAdmin.from("users").select("balance").eq("id", tx.user_id).single();
    if (user) {
      const returnedBalance = Number(user.balance) + Number(tx.amount);
      await supabaseAdmin.from("users").update({ balance: returnedBalance }).eq("id", tx.user_id);
    }

    // 3. Notificação de rejeição de levantamento
    await supabaseAdmin.from('notifications').insert({
      user_id: tx.user_id,
      message: `O seu pedido de levantamento de ${Number(tx.amount).toFixed(2)} MZN foi rejeitado. O valor foi devolvido ao seu saldo.`,
      type: "deposit_failed"
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao rejeitar saque" };
  }
}

export async function approveAllPendingWithdrawals() {
  try {
    const { data: pending } = await supabaseAdmin
      .from("transactions")
      .select("id, user_id, amount, users(email)")
      .eq("type", "WITHDRAW")
      .eq("status", "PENDING");

    if (!pending || pending.length === 0) {
      return { success: false, error: "Nenhum saque pendente encontrado." };
    }

    const ids = pending.map(tx => tx.id);

    await supabaseAdmin
      .from("transactions")
      .update({ status: "COMPLETED" })
      .in("id", ids);

    const notifications = pending.map(tx => ({
      user_id: tx.user_id,
      message: `O seu pedido de levantamento de ${Number(tx.amount).toFixed(2)} MZN foi aprovado e processado com sucesso! O valor será creditado na sua conta cadastrada em até 48 horas.`,
      type: "deposit_success"
    }));

    await supabaseAdmin.from("notifications").insert(notifications);

    // Enviar e-mails em paralelo para quem tiver e-mail cadastrado
    const getEmail = (tx: any) => {
      if (!tx.users) return null;
      if (Array.isArray(tx.users)) {
        return tx.users[0]?.email || null;
      }
      return tx.users.email || null;
    };

    const emailPromises = pending
      .filter(tx => getEmail(tx))
      .map(async (tx) => {
        const email = getEmail(tx);
        try {
          const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");
          await resend.emails.send({
            from: "MozBet <suporte@mozbet.online>",
            to: [email],
            subject: "Levantamento Aprovado - MozBet",
            html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; background-color: #0f172a; color: white; padding: 40px; border-radius: 20px;">
                <h1 style="color: #00FF7F; text-align: center;">Levantamento Aprovado</h1>
                <p>Olá,</p>
                <p>O seu pedido de levantamento no valor de <strong>${Number(tx.amount).toFixed(2)} MZN</strong> foi aprovado e processado com sucesso.</p>
                <div style="background-color: #1e293b; padding: 20px; border-radius: 12px; text-align: center; margin: 30px 0; border: 1px solid #00FF7F;">
                  <span style="font-size: 18px; font-weight: bold; color: #00FF7F;">Status: Aprovado (Até 48 horas)</span>
                </div>
                <p>O valor será creditado na sua conta móvel (M-Pesa / e-Mola) cadastrada no sistema em um prazo máximo de <strong>48 horas</strong>.</p>
                <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 30px;">Obrigado por escolher a MozBet!</p>
              </div>
            `,
          });
        } catch (emailErr) {
          console.error("Erro ao enviar e-mail de aprovação de saque em lote:", emailErr);
        }
      });

    await Promise.all(emailPromises);

    return { success: true, count: pending.length };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao aprovar saques em lote" };
  }
}

export async function rejectAllPendingWithdrawals() {
  try {
    const { data: pending } = await supabaseAdmin
      .from("transactions")
      .select("id, user_id, amount")
      .eq("type", "WITHDRAW")
      .eq("status", "PENDING");

    if (!pending || pending.length === 0) {
      return { success: false, error: "Nenhum saque pendente encontrado." };
    }

    const ids = pending.map(tx => tx.id);

    await supabaseAdmin
      .from("transactions")
      .update({ status: "FAILED" })
      .in("id", ids);

    const promises = pending.map(async (tx) => {
      const { data: user } = await supabaseAdmin.from("users").select("balance").eq("id", tx.user_id).single();
      if (user) {
        const returnedBalance = Number(user.balance) + Number(tx.amount);
        await supabaseAdmin.from("users").update({ balance: returnedBalance }).eq("id", tx.user_id);
      }
    });

    await Promise.all(promises);

    const notifications = pending.map(tx => ({
      user_id: tx.user_id,
      message: `O seu pedido de levantamento de ${Number(tx.amount).toFixed(2)} MZN foi rejeitado. O valor foi devolvido ao seu saldo.`,
      type: "deposit_failed"
    }));

    await supabaseAdmin.from("notifications").insert(notifications);

    return { success: true, count: pending.length };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao rejeitar saques em lote" };
  }
}

export async function searchUsersAdmin(term: string) {
  try {
    const cleanPhoneSearch = term.replace(/\D/g, "");
    
    let query = supabaseAdmin
      .from("users")
      .select("*")
      .or("is_affiliate.is.null,is_affiliate.eq.false")
      .order("created_at", { ascending: false });

    let roleFilter = "";
    const termLower = term.toLowerCase().trim();
    if ("administrador".includes(termLower) || "admin".includes(termLower)) {
      roleFilter = "admin";
    } else if ("proprietário".includes(termLower) || "proprietario".includes(termLower) || "dono".includes(termLower) || "super".includes(termLower)) {
      roleFilter = "super_admin";
    } else if ("utilizador".includes(termLower) || "user".includes(termLower) || "cliente".includes(termLower)) {
      roleFilter = "user";
    }

    let orConditions = `id.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`;
    if (cleanPhoneSearch && cleanPhoneSearch.length > 2) {
      orConditions += `,phone.ilike.%${cleanPhoneSearch}%`;
    }
    if (roleFilter) {
      orConditions += `,role.eq.${roleFilter}`;
    }
    
    query = query.or(orConditions);

    const { data, error } = await query.limit(50);
    if (error) throw error;

    const authDataRaw = await supabaseAdmin.auth.admin.listUsers().catch(() => null);
    const authUsers = authDataRaw?.data?.users || [];
    
    return (data || []).map(u => {
      const authUser = authUsers.find((au: any) => au.id === u.id);
      return {
        ...u,
        role: u.role || (u.is_admin ? 'super_admin' : 'user'),
        email: u.email || authUser?.email || null
      };
    });
  } catch (err: any) {
    console.error("Erro na busca de usuários por admin:", err);
    return [];
  }
}

export async function searchTransactionsAdmin(term: string, typeFilter?: "DEPOSIT" | "WITHDRAW") {
  try {
    const cleanPhoneSearch = term.replace(/\D/g, "");
    
    let userIds: string[] = [];
    if (cleanPhoneSearch && cleanPhoneSearch.length > 2) {
      const { data: matchedUsers } = await supabaseAdmin
        .from("users")
        .select("id")
        .or(`phone.ilike.%${cleanPhoneSearch}%,phone.ilike.%${term}%`);
      
      if (matchedUsers && matchedUsers.length > 0) {
        userIds = matchedUsers.map(u => u.id);
      }
    }

    let query = supabaseAdmin
      .from("transactions")
      .select("*, users(phone)");

    if (typeFilter === "DEPOSIT") {
      query = query.in("type", ["DEPOSIT", "BONUS"]);
    } else if (typeFilter === "WITHDRAW") {
      query = query.eq("type", "WITHDRAW");
    }

    let orConditions = `id.ilike.%${term}%,phone.ilike.%${term}%`;
    if (userIds.length > 0) {
      orConditions += `,user_id.in.(${userIds.join(",")})`;
    }
    
    query = query.or(orConditions);

    const { data: transactionsRaw, error } = await query
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return transactionsRaw?.map(tx => ({
      ...tx,
      phone: tx.phone || tx.users?.phone || 'Desconhecido'
    })) || [];
  } catch (err: any) {
    console.error("Erro ao pesquisar transações por admin:", err);
    return [];
  }
}
