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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Visão Geral do Negócio</h1>
        <p className="text-muted-foreground">Monitorize o crescimento financeiro e a atividade dos seus clientes.</p>
      </div>

      {/* Componente Client de Gráficos (Recharts) */}
      <AdminCharts depositsRaw={depositsRaw || []} usersRaw={usersRaw || []} />
    </div>
  );
}
