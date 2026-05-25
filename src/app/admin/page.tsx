import { supabaseAdmin } from "@/lib/auth-server";
import { AdminCharts } from "@/components/admin/AdminCharts";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  // 1. Contagem exata de usuários
  const { count: usersCount } = await supabaseAdmin
    .from("users")
    .select("*", { count: "exact", head: true });

  const totalUsersCount = usersCount || 0;

  // 2. Calcular totais gerais de depósitos concluídos (Paginado)
  let totalDepositsSum = 0;
  let hasMoreDeps = true;
  let depPage = 0;
  const pageSize = 1000;

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

  // 3. Calcular totais gerais de levantamentos concluídos (Paginado)
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

  // 4. Calcular total de depósitos que falharam (soma e contagem) (Paginado)
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

  // 5. Calcular saldo dos clientes (Passivo) (Paginado)
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

  // 6. Buscar dados dos últimos 90 dias para os gráficos (evitando extrapolar o limite de 1000)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const ninetyDaysAgoISO = ninetyDaysAgo.toISOString();

  // Para o gráfico de usuários: registros criados nos últimos 90 dias
  const { data: usersRaw } = await supabaseAdmin
    .from("users")
    .select("created_at, balance")
    .gte("created_at", ninetyDaysAgoISO);

  // Para o gráfico de depósitos: concluídos nos últimos 90 dias
  const { data: depositsRaw } = await supabaseAdmin
    .from("transactions")
    .select("created_at, amount")
    .eq("type", "DEPOSIT")
    .eq("status", "COMPLETED")
    .gte("created_at", ninetyDaysAgoISO);

  // Para o gráfico de levantamentos: concluídos nos últimos 90 dias
  const { data: withdrawalsRaw } = await supabaseAdmin
    .from("transactions")
    .select("created_at, amount")
    .in("type", ["WITHDRAW", "WITHDRAWAL"])
    .eq("status", "COMPLETED")
    .gte("created_at", ninetyDaysAgoISO);

  // Para o gráfico de falhas: falhos nos últimos 90 dias
  const { data: failedRaw } = await supabaseAdmin
    .from("transactions")
    .select("created_at, amount")
    .eq("type", "DEPOSIT")
    .eq("status", "FAILED")
    .gte("created_at", ninetyDaysAgoISO);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Monitoramento Financeiro Avançado</h1>
        <p className="text-muted-foreground">Métricas de crescimento, fluxo de caixa e atividade em tempo real.</p>
      </div>

      {/* Componente Client de Gráficos (Recharts) */}
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
      />
    </div>
  );
}
