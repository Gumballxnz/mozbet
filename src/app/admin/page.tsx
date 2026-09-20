import { supabaseAdmin } from "@/lib/auth-server";
import { AdminCharts } from "@/components/admin/AdminCharts";
import { cleanupPendingDeposits } from "@/app/admin/transactions/actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {

  await cleanupPendingDeposits();

  async function fetchPagedData<T>(
    fetcher: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>
  ): Promise<T[]> {
    let results: T[] = [];
    let page = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await fetcher(page * limit, (page + 1) * limit - 1);
      if (error || !data || data.length === 0) {
        hasMore = false;
      } else {
        results = results.concat(data);
        if (data.length < limit) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }
    return results;
  }

  const { count: usersCount } = await supabaseAdmin
    .from("users")
    .select("*", { count: "exact", head: true });

  const totalUsersCount = usersCount || 0;

  const pageSize = 1000;

  let totalDepositsSum = 0;
  let hasMoreDeps = true;
  let depPage = 0;

  while (hasMoreDeps) {
    const { data, error } = await supabaseAdmin
      .from("transactions")
      .select("amount")
      .eq("type", "DEPOSIT")
      .eq("status", "COMPLETED")
      .range(depPage * pageSize, (depPage + 1) * pageSize - 1);

    if (error || !data || data.length === 0) {
      hasMoreDeps = false;
    } else {
      totalDepositsSum += data.reduce((acc, curr) => acc + Number(curr.amount), 0);
      if (data.length < pageSize) hasMoreDeps = false;
      else depPage++;
    }
  }

  let totalWithdrawalsSum = 0;
  let hasMoreWithds = true;
  let withPage = 0;

  while (hasMoreWithds) {
    const { data, error } = await supabaseAdmin
      .from("transactions")
      .select("amount")
      .in("type", ["WITHDRAW", "WITHDRAWAL"])
      .eq("status", "COMPLETED")
      .range(withPage * pageSize, (withPage + 1) * pageSize - 1);

    if (error || !data || data.length === 0) {
      hasMoreWithds = false;
    } else {
      totalWithdrawalsSum += data.reduce((acc, curr) => acc + Number(curr.amount), 0);
      if (data.length < pageSize) hasMoreWithds = false;
      else withPage++;
    }
  }

  let totalFailedSum = 0;
  let failedCount = 0;
  let hasMoreFailed = true;
  let failedPage = 0;

  while (hasMoreFailed) {
    const { data, error } = await supabaseAdmin
      .from("transactions")
      .select("amount")
      .eq("type", "DEPOSIT")
      .eq("status", "FAILED")
      .range(failedPage * pageSize, (failedPage + 1) * pageSize - 1);

    if (error || !data || data.length === 0) {
      hasMoreFailed = false;
    } else {
      totalFailedSum += data.reduce((acc, curr) => acc + Number(curr.amount), 0);
      failedCount += data.length;
      if (data.length < pageSize) hasMoreFailed = false;
      else failedPage++;
    }
  }

  let totalRetainedSum = 0;
  let hasMoreUsers = true;
  let userPage = 0;

  while (hasMoreUsers) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("balance")
      .range(userPage * pageSize, (userPage + 1) * pageSize - 1);

    if (error || !data || data.length === 0) {
      hasMoreUsers = false;
    } else {
      totalRetainedSum += data.reduce((acc, curr) => acc + Number(curr.balance || 0), 0);
      if (data.length < pageSize) hasMoreUsers = false;
      else userPage++;
    }
  }

  const referredUserIds = await fetchPagedData<{ id: string }>(async (from, to) =>
    supabaseAdmin
      .from("users")
      .select("id")
      .not("referrer_id", "is", null)
      .range(from, to)
  );
  const referredIdSet = new Set(referredUserIds.map(u => u.id));

  const allDepositsWithUser = await fetchPagedData<{ user_id: string; amount: number }>(async (from, to) =>
    supabaseAdmin
      .from("transactions")
      .select("user_id, amount")
      .eq("type", "DEPOSIT")
      .eq("status", "COMPLETED")
      .range(from, to)
  );

  let affiliateDepositsSum = 0;
  let directDepositsSum = 0;
  allDepositsWithUser.forEach(dep => {
    const amt = Number(dep.amount);
    if (referredIdSet.has(dep.user_id)) {
      affiliateDepositsSum += amt;
    } else {
      directDepositsSum += amt;
    }
  });

  const affiliateBalances = await fetchPagedData<{ affiliate_balance: number }>(async (from, to) =>
    supabaseAdmin
      .from("users")
      .select("affiliate_balance")
      .eq("is_affiliate", true)
      .range(from, to)
  );
  const totalAffiliateBalance = affiliateBalances.reduce((s, a) => s + Number(a.affiliate_balance || 0), 0);

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const ninetyDaysAgoISO = ninetyDaysAgo.toISOString();

  const usersRaw = await fetchPagedData(async (from, to) =>
    supabaseAdmin
      .from("users")
      .select("created_at, balance")
      .gte("created_at", ninetyDaysAgoISO)
      .range(from, to)
  );

  const depositsRaw = await fetchPagedData(async (from, to) =>
    supabaseAdmin
      .from("transactions")
      .select("created_at, amount")
      .eq("type", "DEPOSIT")
      .eq("status", "COMPLETED")
      .gte("created_at", ninetyDaysAgoISO)
      .range(from, to)
  );

  const withdrawalsRaw = await fetchPagedData(async (from, to) =>
    supabaseAdmin
      .from("transactions")
      .select("created_at, amount")
      .in("type", ["WITHDRAW", "WITHDRAWAL"])
      .eq("status", "COMPLETED")
      .gte("created_at", ninetyDaysAgoISO)
      .range(from, to)
  );

  const failedRaw = await fetchPagedData(async (from, to) =>
    supabaseAdmin
      .from("transactions")
      .select("created_at, amount")
      .eq("type", "DEPOSIT")
      .eq("status", "FAILED")
      .gte("created_at", ninetyDaysAgoISO)
      .range(from, to)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Monitoramento Financeiro Avançado</h1>
        <p className="text-muted-foreground">Métricas de crescimento, fluxo de caixa e atividade em tempo real.</p>
      </div>

      <AdminCharts
        depositsRaw={depositsRaw || []}
        usersRaw={usersRaw || []}
        withdrawalsRaw={withdrawalsRaw || []}
        failedRaw={failedRaw || []}
        usersCount={totalUsersCount}
        initialTotalDeposits={totalDepositsSum}
        initialTotalWithdrawals={totalWithdrawalsSum}
        initialTotalFailed={totalFailedSum}
        initialFailedCount={failedCount}
        initialTotalRetained={totalRetainedSum}
        affiliateDeposits={affiliateDepositsSum}
        directDeposits={directDepositsSum}
        totalAffiliateBalance={totalAffiliateBalance}
      />
    </div>
  );
}
