import { supabaseAdmin } from "@/lib/auth-server";
import { AdminTransactionsTable } from "@/components/admin/AdminTransactionsTable";
import { cleanupPendingDeposits } from "@/app/admin/transactions/actions";

export const dynamic = "force-dynamic";

export default async function AdminTransactionsPage() {

  await cleanupPendingDeposits();

  const { data: transactionsRaw, count } = await supabaseAdmin
    .from("transactions")
    .select("*, users(phone)", { count: "exact" })
    .in("type", ["DEPOSIT", "BONUS"])
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
      typeFilter="DEPOSIT"
    />
  );
}
