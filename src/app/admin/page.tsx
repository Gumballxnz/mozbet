import { supabaseAdmin } from "@/lib/auth-server";
import { formatMZN } from "@/lib/utils";
import { Users, Wallet, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import { AdminCharts } from "@/components/admin/AdminCharts";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  // Buscar totais e users raw
  const { data: usersRaw, count: usersCount } = await supabaseAdmin
    .from("users")
    .select("created_at, balance", { count: "exact" });

  // Buscar transacoes completas
  const { data: depositsRaw } = await supabaseAdmin
    .from("transactions")
    .select("created_at, amount")
    .eq("type", "DEPOSIT")
    .eq("status", "COMPLETED");

  const totalDeposits = depositsRaw?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
  const totalBalanceLiability = usersRaw?.reduce((acc, curr) => acc + Number(curr.balance), 0) || 0;

  const stats = [
    {
      title: "Utilizadores Registados",
      value: usersCount || 0,
      icon: Users,
      trend: "Métricas globais",
      up: true,
    },
    {
      title: "Volume de Depósitos",
      value: formatMZN(totalDeposits),
      icon: Wallet,
      trend: "Total acumulado",
      up: true,
    },
    {
      title: "Saldo Retido (Passivo)",
      value: formatMZN(totalBalanceLiability),
      icon: Activity,
      trend: "Dinheiro nas contas",
      up: false,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Visão Geral do Negócio</h1>
        <p className="text-muted-foreground">Monitorize o crescimento financeiro e a atividade dos seus clientes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-surface border border-white/5 p-6 rounded-2xl relative overflow-hidden shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <Icon className="w-5 h-5" />
                </div>
                <div className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider ${stat.up ? 'text-primary' : 'text-red-500'}`}>
                  {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.trend}
                </div>
              </div>
              <h3 className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-1">{stat.title}</h3>
              <p className="text-3xl font-mono-data font-black text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Componente Client de Gráficos (Recharts) */}
      <AdminCharts depositsRaw={depositsRaw || []} usersRaw={usersRaw || []} />
    </div>
  );
}
