"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatMZN } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock, XCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  status: string;
  created_at: string;
  phone?: string;
}

export function AdminTransactionsTable({ initialTransactions }: { initialTransactions: Transaction[] }) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Polling seguro usando Server Actions a cada 3 segundos
    // Isso ignora o bloqueio do RLS porque usa o supabaseAdmin no backend
    const interval = setInterval(async () => {
      try {
        const { getLatestTransactions } = await import("@/app/admin/transactions/actions");
        const latest = await getLatestTransactions();
        if (latest && latest.length > 0) {
          // Apenas atualiza se houver dados
          setTransactions(latest as Transaction[]);
        }
      } catch (err) {
        console.error("Erro ao buscar transações em realtime:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const filtered = transactions.filter(t => t.phone?.includes(search) || t.type.includes(search.toUpperCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Transações Financeiras</h1>
          <p className="text-muted-foreground">Monitorização Realtime de M-Pesa e E-Mola.</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Procurar telemóvel ou tipo..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#101116] border-[#2A2F40] h-10 text-white"
          />
        </div>
      </div>

      <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-gray-500 uppercase bg-[#0B0C10] border-b border-[#2A2F40] font-black tracking-wider">
              <tr>
                <th className="px-6 py-4">Data/Hora</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Telefone</th>
                <th className="px-6 py-4">Valor (MT)</th>
                <th className="px-6 py-4 text-right">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr key={tx.id} className="border-b border-[#2A2F40]/50 hover:bg-[#1A1D27] transition-colors">
                  <td className="px-6 py-4 text-gray-400 font-medium whitespace-nowrap">
                    {new Date(tx.created_at).toLocaleString("pt-MZ")}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {tx.type === "DEPOSIT" && <ArrowDownLeft className="w-4 h-4 text-primary" />}
                      {tx.type === "WITHDRAW" && <ArrowUpRight className="w-4 h-4 text-red-500" />}
                      {tx.type === "BONUS" && <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">B</div>}
                      <span className="font-bold text-white">{tx.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono-data text-gray-300">
                    +258 {tx.phone}
                  </td>
                  <td className="px-6 py-4 font-mono-data font-black text-white text-lg">
                    {formatMZN(tx.amount)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {tx.status === "COMPLETED" && (
                      <span className="inline-flex items-center gap-1 text-primary font-bold">
                        <CheckCircle2 className="w-4 h-4" /> Pago
                      </span>
                    )}
                    {tx.status === "PENDING" && (
                      <span className="inline-flex items-center gap-1 text-orange-500 font-bold">
                        <Clock className="w-4 h-4" /> Pendente
                      </span>
                    )}
                    {tx.status === "FAILED" && (
                      <span className="inline-flex items-center gap-1 text-red-500 font-bold">
                        <XCircle className="w-4 h-4" /> Falhou
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium">
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
