import { supabaseAdmin } from "@/lib/auth-server";
import { AdminTransactionsTable } from "@/components/admin/AdminTransactionsTable";

export const dynamic = "force-dynamic";

export default async function AdminTransactionsPage() {
  const { data: transactionsRaw, count } = await supabaseAdmin
    .from("transactions")
    .select("*, users(phone)", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(30);

  const initialTransactions = transactionsRaw?.map(tx => ({
    ...tx,
    phone: tx.users?.phone || 'Desconhecido'
  })) || [];

  return (
    <AdminTransactionsTable 
      initialTransactions={initialTransactions} 
      initialTotalCount={count || 0} 
    />
  );
}
