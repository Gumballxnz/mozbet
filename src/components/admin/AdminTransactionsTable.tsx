"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatMZN } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock, XCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getLatestTransactions, getMoreTransactions } from "@/app/admin/transactions/actions";

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  status: string;
  created_at: string;
  phone?: string;
}

export function AdminTransactionsTable({ initialTransactions, initialTotalCount }: { initialTransactions: Transaction[], initialTotalCount: number }) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [loadingMore, setLoadingMore] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvingMultiple, setApprovingMultiple] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    // Polling seguro usando Server Actions a cada 3 segundos
    // Isso ignora o bloqueio do RLS porque usa o supabaseAdmin no backend
    const interval = setInterval(async () => {
      try {
        const latest = await getLatestTransactions();
        if (latest && latest.length > 0) {
          // Atualiza apenas os novos (os primeiros 30) e preserva o resto
          setTransactions(prev => {
            const newTxsMap = new Map(latest.map(t => [t.id, t]));
            const merged = [...latest as Transaction[]];
            for (const t of prev) {
              if (!newTxsMap.has(t.id)) merged.push(t);
            }
            return merged;
          });
        }
      } catch (err) {
        console.error("Erro ao buscar transações em realtime:", err);
      }
    }, 5000); // Polling a cada 5s

    return () => clearInterval(interval);
  }, []);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const moreTxs = await getMoreTransactions(transactions.length);
      if (moreTxs.length > 0) {
        setTransactions(prev => [...prev, ...moreTxs as Transaction[]]);
      }
    } catch (err) {
      toast.error("Erro ao carregar mais transações");
    } finally {
      setLoadingMore(false);
    }
  };



  const filtered = transactions.filter(t => {
    const matchesSearch = t.phone?.includes(search) || t.type.includes(search.toUpperCase());
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    
    if (!startDate && !endDate) return matchesSearch && matchesStatus;
    
    const txDate = new Date(t.created_at);
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();
    if (endDate) end.setHours(23, 59, 59, 999);
    
    const isInRange = txDate >= start && txDate <= end;
    return matchesSearch && matchesStatus && isInRange;
  });

  const handleDownloadCSV = () => {
    if (filtered.length === 0) return toast.error("Nenhuma transação para exportar.");
    
    const headers = ["Data", "Tipo", "Telefone", "Valor", "Estado", "ID"];
    const rows = filtered.map(t => [
      new Date(t.created_at).toLocaleString("pt-MZ"),
      t.type,
      `+258 ${t.phone}`,
      t.amount.toString(),
      t.status,
      t.id
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `extrato-mozbet-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Extrato baixado com sucesso!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 flex-wrap">
        <div className="flex-shrink-0">
          <h1 className="text-3xl font-bold text-white">Transações Financeiras</h1>
          <p className="text-muted-foreground">Monitorização Realtime de M-Pesa e E-Mola. <span className="text-white font-bold ml-2">Total: {totalCount}</span></p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-[#101116] border border-[#2A2F40] rounded-xl px-2">
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="bg-transparent text-[10px] text-white outline-none p-2 h-9"
            />
            <span className="text-gray-500">até</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="bg-transparent text-[10px] text-white outline-none p-2 h-9"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#101116] border border-[#2A2F40] rounded-xl px-3 text-xs text-white outline-none h-10"
            >
              <option value="ALL">Todos os Estados</option>
              <option value="COMPLETED">✅ Aprovadas</option>
              <option value="FAILED">❌ Falhadas</option>
            </select>
          </div>

          <Button 
            onClick={handleDownloadCSV}
            className="bg-primary/20 text-primary border border-primary/50 font-bold h-10 px-4"
          >
            Baixar Extrato
          </Button>



          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Procurar telemóvel..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#101116] border-[#2A2F40] h-10 text-white"
            />
          </div>
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
                <th className="px-6 py-4 text-center">Estado</th>
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
                  <td className="px-6 py-4 text-center">
                    {tx.status === "COMPLETED" && (
                      <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4" /> Aprovada
                      </span>
                    )}
                    {tx.status === "FAILED" && (
                      <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-500 px-2 py-1 rounded-md font-bold text-xs">
                        <XCircle className="w-4 h-4" /> Falhou
                      </span>
                    )}
                    {tx.status === "PENDING" && (
                      <span className="inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-md font-bold text-xs">
                        <Clock className="w-4 h-4" /> Pendente
                      </span>
                    )}
                  </td>

                </tr>
              ))}
              
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground font-medium">
                    Nenhuma transação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Botão Carregar Mais */}
      {transactions.length < totalCount && (
        <div className="flex justify-center mt-6 mb-8">
          <Button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 font-bold px-8"
          >
            {loadingMore ? "A Carregar..." : "Carregar Mais Transações"}
          </Button>
        </div>
      )}
    </div>
  );
}
