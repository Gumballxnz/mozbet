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
