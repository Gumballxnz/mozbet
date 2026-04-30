import { supabaseAdmin } from "@/lib/auth-server";
import { formatMZN } from "@/lib/utils";
import { Users, Wallet, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  // Buscar totais
  const { count: usersCount } = await supabaseAdmin
    .from("users")
    .select("*", { count: "exact", head: true });

  const { data: deposits } = await supabaseAdmin
    .from("transactions")
    .select("amount")
    .eq("type", "DEPOSIT")
    .eq("status", "COMPLETED");

  const { data: usersData } = await supabaseAdmin
    .from("users")
    .select("balance");

  const totalDeposits = deposits?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
  const totalBalanceLiability = usersData?.reduce((acc, curr) => acc + Number(curr.balance), 0) || 0;

  const stats = [
    {
      title: "Utilizadores Registados",
      value: usersCount || 0,
      icon: Users,
      trend: "+12% esta semana",
      up: true,
    },
    {
      title: "Volume de Depósitos",
      value: formatMZN(totalDeposits),
      icon: Wallet,
      trend: "+24% esta semana",
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
        <h1 className="text-3xl font-bold text-white mb-2">Visão Geral</h1>
        <p className="text-muted-foreground">Monitorize o desempenho da casa de apostas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-surface border border-white/5 p-6 rounded-2xl relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <Icon className="w-5 h-5" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold ${stat.up ? 'text-primary' : 'text-red-500'}`}>
                  {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.trend}
                </div>
              </div>
              <h3 className="text-muted-foreground text-sm font-medium mb-1">{stat.title}</h3>
              <p className="text-3xl font-mono-data font-bold text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-surface border border-white/5 p-6 rounded-2xl">
        <h2 className="text-xl font-bold text-white mb-4">Depósitos Recentes</h2>
        <div className="flex items-center justify-center py-12 border-2 border-dashed border-white/10 rounded-xl">
          <p className="text-muted-foreground text-sm">O histórico de depósitos aparecerá aqui em tempo real.</p>
        </div>
      </div>
    </div>
  );
}
