"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatMZN } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, XCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getLatestTransactions, getMoreTransactions, approveWithdraw, rejectWithdraw, approveAllPendingWithdrawals, rejectAllPendingWithdrawals } from "@/app/admin/transactions/actions";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  status: string;
  created_at: string;
  phone?: string;
}

export function AdminTransactionsTable({ 
  initialTransactions, 
  initialTotalCount,
  typeFilter 
}: { 
  initialTransactions: Transaction[], 
  initialTotalCount: number,
  typeFilter: "DEPOSIT" | "WITHDRAW"
}) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [totalCount, setTotalCount] = useState(initialTotalCount);

  const renderStatus = (tx: Transaction) => {
    if (tx.status === "COMPLETED") {
      let label = "Pago";
      if (tx.type === "DEPOSIT") label = "Depósito Aceito";
      else if (tx.type === "WITHDRAW") label = "Saque Aprovado";
      else if (tx.type === "BONUS") label = "Bônus Pago";
      return (
        <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-md font-bold text-xs">
          <CheckCircle2 className="w-3.5 h-3.5" /> {label}
        </span>
      );
    }
    if (tx.status === "FAILED") {
      let label = "Falho";
      if (tx.type === "DEPOSIT") label = "Depósito Recusado";
      else if (tx.type === "WITHDRAW") label = "Saque Recusado";
      else if (tx.type === "BONUS") label = "Bônus Cancelado";
      return (
        <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-500 px-2.5 py-1 rounded-md font-bold text-xs">
          <XCircle className="w-3.5 h-3.5" /> {label}
        </span>
      );
    }
    if (tx.status === "PENDING") {
      let label = "Pendente";
      if (tx.type === "DEPOSIT") label = "Aguardando PIN";
      else if (tx.type === "WITHDRAW") label = "Saque Pendente";
      return (
        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-2.5 py-1 rounded-md font-bold text-xs">
            {label}
          </span>
          {tx.type === "WITHDRAW" && (
            <div className="flex gap-1.5 ml-2">
              <button
                onClick={() => handleApproveWithdraw(tx.id)}
                className="bg-green-600 hover:bg-green-700 text-white font-black text-[9px] uppercase px-2 py-1 rounded cursor-pointer transition-colors active:scale-95 shadow-md shadow-green-900/30"
              >
                Aprovar
              </button>
              <button
                onClick={() => handleRejectWithdraw(tx.id)}
                className="bg-red-600 hover:bg-red-700 text-white font-black text-[9px] uppercase px-2 py-1 rounded cursor-pointer transition-colors active:scale-95 shadow-md shadow-red-900/30"
              >
                Rejeitar
              </button>
            </div>
          )}
        </div>
      );
    }
    return null;
  };
  const [loadingMore, setLoadingMore] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvingMultiple, setApprovingMultiple] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const hasPendingWithdrawals = typeFilter === "WITHDRAW" && transactions.some(tx => tx.status === "PENDING");

  // Modal de confirmação customizado para ações de aprovar/rejeitar
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const executeApproveWithdraw = async (txId: string) => {
    toast.loading("A processar aprovação...", { id: "tx-action" });
    try {
      const res = await approveWithdraw(txId);
      toast.dismiss("tx-action");
      if (res.success) {
        toast.success("Levantamento aprovado com sucesso!");
        setTransactions(prev => prev.map(tx => tx.id === txId ? { ...tx, status: "COMPLETED" } : tx));
      } else {
        toast.error("Erro", { description: res.error });
      }
    } catch {
      toast.dismiss("tx-action");
      toast.error("Erro interno ao processar levantamento.");
    }
  };

  const executeRejectWithdraw = async (txId: string) => {
    toast.loading("A processar rejeição...", { id: "tx-action" });
    try {
      const res = await rejectWithdraw(txId);
      toast.dismiss("tx-action");
      if (res.success) {
        toast.success("Levantamento rejeitado e saldo devolvido!");
        setTransactions(prev => prev.map(tx => tx.id === txId ? { ...tx, status: "FAILED" } : tx));
      } else {
        toast.error("Erro", { description: res.error });
      }
    } catch {
      toast.dismiss("tx-action");
      toast.error("Erro interno ao rejeitar levantamento.");
    }
  };

  const handleApproveWithdraw = (txId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Aprovar Levantamento",
      description: "Tem a certeza que deseja APROVAR este levantamento e liberar o pagamento para o cliente?",
      onConfirm: () => executeApproveWithdraw(txId)
    });
  };

  const handleRejectWithdraw = (txId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Rejeitar Levantamento",
      description: "Tem a certeza que deseja REJEITAR este levantamento? O valor será devolvido ao saldo do cliente.",
      onConfirm: () => executeRejectWithdraw(txId)
    });
  };

  const executeApproveAllWithdrawals = async () => {
    toast.loading("A aprovar todos os saques pendentes...", { id: "tx-bulk-action" });
    try {
      const res = await approveAllPendingWithdrawals();
      toast.dismiss("tx-bulk-action");
      if (res.success) {
        toast.success(`Aprovados ${res.count} saques com sucesso!`);
        setTransactions(prev => prev.map(tx => tx.type === "WITHDRAW" && tx.status === "PENDING" ? { ...tx, status: "COMPLETED" } : tx));
      } else {
        toast.error("Erro", { description: res.error });
      }
    } catch {
      toast.dismiss("tx-bulk-action");
      toast.error("Erro interno ao processar aprovação em lote.");
    }
  };

  const executeRejectAllWithdrawals = async () => {
    toast.loading("A rejeitar todos os saques pendentes...", { id: "tx-bulk-action" });
    try {
      const res = await rejectAllPendingWithdrawals();
      toast.dismiss("tx-bulk-action");
      if (res.success) {
        toast.success(`Rejeitados ${res.count} saques e saldo devolvido aos clientes!`);
        setTransactions(prev => prev.map(tx => tx.type === "WITHDRAW" && tx.status === "PENDING" ? { ...tx, status: "FAILED" } : tx));
      } else {
        toast.error("Erro", { description: res.error });
      }
    } catch {
      toast.dismiss("tx-bulk-action");
      toast.error("Erro interno ao processar rejeição em lote.");
    }
  };

  const handleApproveAllWithdrawals = () => {
    setConfirmModal({
      isOpen: true,
      title: "Aprovar Todos os Saques Pendentes",
      description: "Tem a certeza que deseja APROVAR TODOS os saques com estado PENDENTE de uma só vez?",
      onConfirm: () => executeApproveAllWithdrawals()
    });
  };

  const handleRejectAllWithdrawals = () => {
    setConfirmModal({
      isOpen: true,
      title: "Rejeitar Todos os Saques Pendentes",
      description: "Tem a certeza que deseja REJEITAR TODOS os saques com estado PENDENTE? O valor de cada um será devolvido à conta de cada cliente.",
      onConfirm: () => executeRejectAllWithdrawals()
    });
  };


  useEffect(() => {
    // 1. Escuta realtime do Supabase para transações (atualização instantânea)
    const channel = supabase.channel(`admin-transactions-${typeFilter}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, async (payload) => {
        const type = payload.new.type;
        const isMatch = typeFilter === "DEPOSIT" 
          ? (type === "DEPOSIT" || type === "BONUS")
          : (type === "WITHDRAW");
        if (!isMatch) return;

        const { data: u } = await supabase.from("users").select("phone").eq("id", payload.new.user_id).single();
        const newTx = {
          ...payload.new,
          phone: u?.phone || "Desconhecido"
        } as Transaction;

        setTransactions(prev => {
          // Evita duplicar se já foi adicionado pelo polling
          if (prev.some(t => t.id === newTx.id)) return prev;
          return [newTx, ...prev];
        });
        setTotalCount(prev => prev + 1);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'transactions' }, payload => {
        const type = payload.new.type;
        const isMatch = typeFilter === "DEPOSIT" 
          ? (type === "DEPOSIT" || type === "BONUS")
          : (type === "WITHDRAW");
        if (!isMatch) return;

        setTransactions(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'transactions' }, payload => {
        setTransactions(prev => {
          const exists = prev.some(t => t.id === payload.old.id);
          if (!exists) return prev;
          setTotalCount(c => Math.max(0, c - 1));
          return prev.filter(t => t.id !== payload.old.id);
        });
      })
      .subscribe();

    // 2. Polling de redundância a cada 10 segundos para garantir consistência
    const interval = setInterval(async () => {
      try {
        const latest = await getLatestTransactions(typeFilter);
        if (latest && latest.length > 0) {
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
        console.error("Erro no polling de redundância das transações:", err);
      }
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [typeFilter]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const moreTxs = await getMoreTransactions(transactions.length, typeFilter);
      if (moreTxs.length > 0) {
        setTransactions(prev => [...prev, ...moreTxs as Transaction[]]);
      }
    } catch (err) {
      toast.error("Erro ao carregar mais transações");
    } finally {
      setLoadingMore(false);
    }
  };
  // 1. Agrupar bônus e depósitos correspondentes baseados em proximidade de tempo (até 2 min)
  const groupedTransactions: (Transaction & { bonusAmount?: number })[] = [];
  const processedBonusIds = new Set<string>();

  const depositsAndWithdraws = transactions.map(tx => ({ ...tx }));

  depositsAndWithdraws.forEach(tx => {
    if (tx.type === "DEPOSIT") {
      const txTime = new Date(tx.created_at).getTime();
      const matchingBonus = transactions.find(b => 
        b.type === "BONUS" &&
        b.user_id === tx.user_id &&
        !processedBonusIds.has(b.id) &&
        Math.abs(new Date(b.created_at).getTime() - txTime) < 120000 // 2 minutos
      );

      if (matchingBonus) {
        tx.bonusAmount = matchingBonus.amount;
        processedBonusIds.add(matchingBonus.id);
      }
    }
  });

  transactions.forEach(tx => {
    if (tx.type === "BONUS") {
      if (!processedBonusIds.has(tx.id)) {
        groupedTransactions.push(tx);
      }
    } else {
      const modified = depositsAndWithdraws.find(d => d.id === tx.id);
      if (modified) {
        groupedTransactions.push(modified);
      } else {
        groupedTransactions.push(tx);
      }
    }
  });

  const filtered = groupedTransactions.filter(t => {
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
    
    const headers = ["Data", "Tipo", "Telefone", "Valor Pago", "Bónus Pago", "Estado", "ID"];
    const rows = filtered.map(t => [
      new Date(t.created_at).toLocaleString("pt-MZ"),
      t.type,
      `+258 ${t.phone}`,
      t.amount.toString(),
      t.bonusAmount ? t.bonusAmount.toString() : "0",
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
          <h1 className="text-3xl font-bold text-white">
            {typeFilter === "DEPOSIT" ? "Depósitos Financeiros" : "Saques & Levantamentos"}
          </h1>
          <p className="text-muted-foreground">
            {typeFilter === "DEPOSIT" 
              ? "Monitorização Realtime de depósitos M-Pesa e E-Mola para Depósitos e Bónus." 
              : "Monitorização e aprovação manual de levantamentos de fundos."}
            <span className="text-white font-bold ml-2">Total: {filtered.length}</span>
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full xl:w-auto">
          <div className="flex items-center justify-between gap-2 bg-[#101116] border border-[#2A2F40] rounded-xl px-2 h-10 w-full sm:w-auto">
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="bg-transparent text-[10px] text-white outline-none p-2 h-9 flex-1 text-center"
            />
            <span className="text-gray-500 text-xs">até</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="bg-transparent text-[10px] text-white outline-none p-2 h-9 flex-1 text-center"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#101116] border border-[#2A2F40] rounded-xl px-3 text-xs text-white outline-none h-10 w-full sm:w-auto cursor-pointer"
            >
              <option value="ALL">Todos os Estados</option>
              {typeFilter === "DEPOSIT" ? (
                <>
                  <option value="COMPLETED">✅ Depósito Aceito</option>
                  <option value="PENDING">⏳ Aguardando PIN</option>
                  <option value="FAILED">❌ Depósito Recusado</option>
                </>
              ) : (
                <>
                  <option value="COMPLETED">✅ Saque Aprovado</option>
                  <option value="PENDING">⏳ Saque Pendente</option>
                  <option value="FAILED">❌ Saque Recusado</option>
                </>
              )}
            </select>
          </div>

          <Button 
            onClick={handleDownloadCSV}
            className="bg-primary/20 text-primary border border-primary/50 font-bold h-10 px-4 w-full sm:w-auto cursor-pointer"
          >
            Baixar Extrato
          </Button>

          {hasPendingWithdrawals && (
            <>
              <Button 
                onClick={handleApproveAllWithdrawals}
                className="bg-green-600 hover:bg-green-700 text-white font-bold h-10 px-4 w-full sm:w-auto cursor-pointer shadow-md shadow-green-900/30"
              >
                Aprovar Todos
              </Button>
              <Button 
                onClick={handleRejectAllWithdrawals}
                className="bg-red-600 hover:bg-red-700 text-white font-bold h-10 px-4 w-full sm:w-auto cursor-pointer shadow-md shadow-red-900/30"
              >
                Rejeitar Todos
              </Button>
            </>
          )}

          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Procurar telemóvel..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#101116] border-[#2A2F40] h-10 text-white w-full"
            />
          </div>
        </div>
      </div>

      {/* Tabela para Desktop */}
      <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl overflow-hidden shadow-xl hidden md:block">
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
                  <td className="px-6 py-4 font-mono-data text-white align-middle">
                    <div className="font-black text-lg">{formatMZN(tx.amount)}</div>
                    {tx.bonusAmount !== undefined && (
                      <div className="text-[10px] text-emerald-400 font-bold mt-0.5 whitespace-nowrap bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        + {formatMZN(tx.bonusAmount)} Bónus
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {renderStatus(tx)}
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

      {/* Layout de Cards para Mobile */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filtered.map((tx) => (
          <div key={tx.id} className="bg-[#101116] border border-[#2A2F40]/60 rounded-2xl p-4 space-y-3 shadow-md text-left">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  {tx.type === "DEPOSIT" && <ArrowDownLeft className="w-4.5 h-4.5 text-primary" />}
                  {tx.type === "WITHDRAW" && <ArrowUpRight className="w-4.5 h-4.5 text-red-500" />}
                  {tx.type === "BONUS" && <div className="w-4.5 h-4.5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[9px]">B</div>}
                  <span className="font-bold text-white text-base">{tx.type}</span>
                </div>
                <span className="text-[10px] text-gray-500 mt-1">{new Date(tx.created_at).toLocaleString("pt-MZ")}</span>
              </div>
              
              <div className="text-right flex flex-col items-end">
                <span className="font-mono-data font-black text-white text-xl block">{formatMZN(tx.amount)}</span>
                {tx.bonusAmount !== undefined && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold mt-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    + {formatMZN(tx.bonusAmount)} Bónus
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[#2A2F40]/30">
              <div>
                <span className="text-gray-500 text-[10px] block">Telefone</span>
                <span className="font-mono-data text-xs text-gray-300 font-bold">+258 {tx.phone}</span>
              </div>

              <div className="flex items-center gap-2">
                {renderStatus(tx)}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl p-8 text-center text-muted-foreground">
            Nenhuma transação encontrada.
          </div>
        )}
      </div>

      {/* Botão Carregar Mais */}
      {transactions.length < totalCount && (
        <div className="flex justify-center mt-6 mb-8 w-full">
          <Button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 font-bold px-8 w-full sm:w-auto cursor-pointer"
          >
            {loadingMore ? "A Carregar..." : "Carregar Mais Transações"}
          </Button>
        </div>
      )}

      {/* Modal de Confirmação Customizado (Substitui confirm do navegador) */}
      <Dialog open={!!confirmModal?.isOpen} onOpenChange={(open) => { if (!open) setConfirmModal(null); }}>
        <DialogContent className="sm:max-w-[400px] bg-[#141516] border border-[#2A2F40]/50 text-white rounded-3xl p-6 shadow-2xl focus:outline-none">
          <DialogTitle className="text-lg font-black text-white uppercase tracking-wider">
            {confirmModal?.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400 mt-2 leading-relaxed">
            {confirmModal?.description}
          </DialogDescription>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setConfirmModal(null)}
              className="bg-[#1A1C24] hover:bg-white/5 border-[#2A2F40] text-gray-300 hover:text-white rounded-xl h-11 px-4 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                confirmModal?.onConfirm();
                setConfirmModal(null);
              }}
              className="bg-primary hover:bg-primary/90 text-black font-black rounded-xl h-11 px-5 cursor-pointer shadow-[0_0_15px_rgba(0,255,127,0.2)]"
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

