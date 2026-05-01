import { supabaseAdmin } from "@/lib/auth-server";
import { AdminTransactionsTable } from "@/components/admin/AdminTransactionsTable";

export const dynamic = "force-dynamic";

export default async function AdminTransactionsPage() {
  const { data: transactionsRaw } = await supabaseAdmin
    .from("transactions")
    .select("*, users(phone)")
    .order("created_at", { ascending: false })
    .limit(50);

  const initialTransactions = transactionsRaw?.map(tx => ({
    ...tx,
    phone: tx.users?.phone || 'Desconhecido'
  })) || [];

  return (
    <AdminTransactionsTable initialTransactions={initialTransactions} />
  );
}
