import { supabaseAdmin } from "@/lib/auth-server";
import { formatMZN } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminTransactionsPage() {
  const { data: transactions } = await supabaseAdmin
    .from("transactions")
    .select("*, users(phone)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Transações Financeiras</h1>
        <p className="text-muted-foreground">Monitorização de M-Pesa e E-Mola via e2Payments.</p>
      </div>

      <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-medium">Data/Hora</th>
                <th className="px-6 py-4 font-medium">Tipo</th>
                <th className="px-6 py-4 font-medium">Telefone</th>
                <th className="px-6 py-4 font-medium">Valor (MT)</th>
                <th className="px-6 py-4 font-medium text-right">Estado</th>
              </tr>
            </thead>
            <tbody>
              {transactions?.map((tx) => (
                <tr key={tx.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                    {new Date(tx.created_at).toLocaleString("pt-MZ")}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {tx.type === "DEPOSIT" && <ArrowDownLeft className="w-4 h-4 text-primary" />}
                      {tx.type === "WITHDRAW" && <ArrowUpRight className="w-4 h-4 text-red-500" />}
                      {tx.type === "BONUS" && <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">B</div>}
                      <span className="font-bold">{tx.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono-data text-white">
                    {tx.phone}
                  </td>
                  <td className="px-6 py-4 font-mono-data font-bold text-white">
                    {formatMZN(tx.amount)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {tx.status === "COMPLETED" && (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <CheckCircle2 className="w-4 h-4" /> Pago
                      </span>
                    )}
                    {tx.status === "PENDING" && (
                      <span className="inline-flex items-center gap-1 text-orange-500">
                        <Clock className="w-4 h-4" /> Pendente
                      </span>
                    )}
                    {tx.status === "FAILED" && (
                      <span className="inline-flex items-center gap-1 text-red-500">
                        <XCircle className="w-4 h-4" /> Falhou
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              
              {(!transactions || transactions.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhuma transação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
