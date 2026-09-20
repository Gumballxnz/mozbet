"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Percent, Copy, ArrowUpDown, ArrowUp, ArrowDown, Filter, Wallet, TrendingUp, Users as UsersIcon, DollarSign, Settings, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatMZN, cleanMocambiquePhone } from "@/lib/utils";

interface AffiliateData {
  id: string;
  email?: string;
  username: string;
  phone: string;
  created_at: string;
  is_active: boolean;
  code: string;
  name: string;
  affPhone: string;
  saqueNumber: string;
  saqueMethod: string;
  saqueName: string;
  balance: number;
  referredCount: number;
  totalDeposits: number;
  depositCommissions: number;
  subCommissions: number;
  winDeductions: number;
  netEarnings: number;
  totalPaid: number;
}

type SortField = "balance" | "netEarnings" | "referredCount" | "totalDeposits" | "name";
type SortDir = "asc" | "desc";
type BalanceFilter = "all" | "positive" | "gt100" | "gt500" | "gt1000" | "negative";

const BALANCE_FILTERS: { value: BalanceFilter; label: string; color: string }[] = [
  { value: "all", label: "Todos", color: "bg-[#2A2F40] text-gray-300" },
  { value: "positive", label: "Saldo > 0", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { value: "gt100", label: "> 100 MT", color: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  { value: "gt500", label: "> 500 MT", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  { value: "gt1000", label: "> 1.000 MT", color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  { value: "negative", label: "Negativos", color: "bg-red-500/15 text-red-400 border-red-500/30" },
];

function filterByBalance(aff: AffiliateData, filter: BalanceFilter): boolean {
  switch (filter) {
    case "positive": return aff.balance > 0;
    case "gt100": return aff.balance > 100;
    case "gt500": return aff.balance > 500;
    case "gt1000": return aff.balance > 1000;
    case "negative": return aff.balance < 0;
    default: return true;
  }
}

export function AdminAffiliatesTable({ initialAffiliates }: { initialAffiliates: AffiliateData[] }) {
  const router = useRouter();
  const [affiliates] = useState<AffiliateData[]>(initialAffiliates);
  const [search, setSearch] = useState("");
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>("all");
  const [sortField, setSortField] = useState<SortField>("balance");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showGlobalCommission, setShowGlobalCommission] = useState(false);
  const [globalPercent, setGlobalPercent] = useState("70");
  const [savingGlobal, setSavingGlobal] = useState(false);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-gray-600 ml-1" />;
    return sortDir === "desc"
      ? <ArrowDown className="w-3 h-3 text-primary ml-1" />
      : <ArrowUp className="w-3 h-3 text-primary ml-1" />;
  };

  const filteredAffiliates = useMemo(() => {
    const searchLower = search.toLowerCase();
    return affiliates
      .filter(a =>
        a.name.toLowerCase().includes(searchLower) ||
        a.username.toLowerCase().includes(searchLower) ||
        a.code.toLowerCase().includes(searchLower) ||
        a.phone.includes(search) ||
        a.id.includes(search) ||
        (a.email && a.email.toLowerCase().includes(searchLower))
      )
      .filter(a => filterByBalance(a, balanceFilter))
      .sort((a, b) => {
        const multiplier = sortDir === "desc" ? -1 : 1;
        if (sortField === "name") return multiplier * a.name.localeCompare(b.name);
        return multiplier * ((a[sortField] as number) - (b[sortField] as number));
      });
  }, [affiliates, search, balanceFilter, sortField, sortDir]);

  const summary = useMemo(() => {
    const totalBalance = affiliates.reduce((s, a) => s + a.balance, 0);
    const totalPositive = affiliates.filter(a => a.balance > 0).length;
    const totalPending = affiliates.filter(a => a.balance > 100).length;
    const totalReferrals = affiliates.reduce((s, a) => s + a.referredCount, 0);
    return { totalBalance, totalPositive, totalPending, totalReferrals };
  }, [affiliates]);

  return (
    <div className="space-y-6">
      {}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Percent className="w-8 h-8 text-primary" />
            CRM de Afiliados
          </h1>
          <p className="text-muted-foreground">Monitorize os parceiros, lucros gerados para a casa, indicados e dados de saque.</p>
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wider uppercase">
            Total de Afiliados: {affiliates.length}
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar Nome, Código, Telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#101116] border-[#2A2F40] h-10 text-white"
          />
        </div>
      </div>

      {}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <button
          onClick={() => setShowGlobalCommission(!showGlobalCommission)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 text-sm font-bold hover:border-amber-400 transition-all cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          Alterar Comissão Global
        </button>

        {showGlobalCommission && (
          <div className="flex items-center gap-3 bg-[#101116] border border-[#2A2F40] rounded-xl px-4 py-3 animate-in fade-in slide-in-from-left-2">
            <label className="text-xs text-gray-400 font-bold uppercase">Nova Comissão:</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                value={globalPercent}
                onChange={(e) => setGlobalPercent(e.target.value)}
                className="w-16 h-8 bg-[#0B0C10] border border-[#2A2F40] rounded-lg text-center text-white font-bold text-sm focus:border-primary outline-none"
              />
              <span className="text-white font-bold">%</span>
            </div>
            <button
              disabled={savingGlobal}
              onClick={async () => {
                setSavingGlobal(true);
                try {
                  const res = await fetch("/api/admin/affiliates/commission", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ percent: Number(globalPercent) }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    toast.success(data.message);
                    setShowGlobalCommission(false);
                  } else {
                    toast.error(data.error || "Erro ao atualizar");
                  }
                } catch {
                  toast.error("Erro de conexão");
                } finally {
                  setSavingGlobal(false);
                }
              }}
              className="h-8 px-4 rounded-lg bg-primary text-black font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {savingGlobal ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Aplicar a Todos
            </button>
            <button
              onClick={() => setShowGlobalCommission(false)}
              className="h-8 px-3 rounded-lg bg-[#2A2F40] text-gray-400 text-xs font-bold hover:text-white transition-all cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#101116] border border-[#2A2F40] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase mb-1">
            <Wallet className="w-4 h-4" /> Saldo Total Pendente
          </div>
          <div className={`text-xl font-black font-mono ${summary.totalBalance >= 0 ? 'text-primary' : 'text-red-500'}`}>
            {formatMZN(summary.totalBalance)}
          </div>
        </div>
        <div className="bg-[#101116] border border-[#2A2F40] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase mb-1">
            <TrendingUp className="w-4 h-4" /> Com Saldo &gt; 0
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono">
            {summary.totalPositive} <span className="text-xs text-gray-500 font-normal">afiliados</span>
          </div>
        </div>
        <div className="bg-[#101116] border border-[#2A2F40] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase mb-1">
            <DollarSign className="w-4 h-4" /> Pendente &gt; 100 MT
          </div>
          <div className="text-xl font-black text-amber-400 font-mono">
            {summary.totalPending} <span className="text-xs text-gray-500 font-normal">afiliados</span>
          </div>
        </div>
        <div className="bg-[#101116] border border-[#2A2F40] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase mb-1">
            <UsersIcon className="w-4 h-4" /> Total de Indicados
          </div>
          <div className="text-xl font-black text-sky-400 font-mono">
            {summary.totalReferrals}
          </div>
        </div>
      </div>

      {}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-500" />
        <span className="text-xs text-gray-500 font-bold uppercase mr-1">Filtrar por saldo:</span>
        {BALANCE_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setBalanceFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              balanceFilter === f.value
                ? `${f.color} ring-1 ring-white/10 scale-105`
                : "bg-[#101116] text-gray-500 border-[#2A2F40] hover:border-gray-500"
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="text-xs text-gray-600 ml-2">
          Mostrando {filteredAffiliates.length} de {affiliates.length}
        </span>
      </div>

      {/* Tabela Desktop */}
      <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl overflow-hidden shadow-xl hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-gray-500 uppercase bg-[#0B0C10] border-b border-[#2A2F40] font-black tracking-wider">
              <tr>
                <th className="px-6 py-4 cursor-pointer select-none hover:text-gray-300 transition-colors" onClick={() => toggleSort("name")}>
                  <span className="flex items-center">Parceiro <SortIcon field="name" /></span>
                </th>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4 text-center cursor-pointer select-none hover:text-gray-300 transition-colors" onClick={() => toggleSort("referredCount")}>
                  <span className="flex items-center justify-center">Indicados <SortIcon field="referredCount" /></span>
                </th>
                <th className="px-6 py-4 cursor-pointer select-none hover:text-gray-300 transition-colors" onClick={() => toggleSort("totalDeposits")}>
                  <span className="flex items-center">Depósitos Jogadores <SortIcon field="totalDeposits" /></span>
                </th>
                <th className="px-6 py-4 cursor-pointer select-none hover:text-gray-300 transition-colors" onClick={() => toggleSort("netEarnings")}>
                  <span className="flex items-center">Lucro do Parceiro <SortIcon field="netEarnings" /></span>
                </th>
                <th className="px-6 py-4 cursor-pointer select-none hover:text-gray-300 transition-colors" onClick={() => toggleSort("balance")}>
                  <span className="flex items-center">Saldo / Pago <SortIcon field="balance" /></span>
                </th>
                <th className="px-6 py-4">Dados de Saque</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredAffiliates.map((aff) => (
                <tr key={aff.id} className="border-b border-[#2A2F40]/50 hover:bg-[#1A1D27] transition-colors">
                  <td className="px-6 py-4 flex flex-col gap-0.5">
                    <span className="font-bold text-white text-sm">
                      {aff.name}
                    </span>
                    <span className="text-xs text-gray-400 font-mono tracking-wider">+{aff.phone}</span>
                    {aff.email && <span className="text-[10px] text-sky-400/80 font-mono">{aff.email}</span>}
                  </td>
                  <td className="px-6 py-4 align-middle">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {aff.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-white text-base align-middle font-mono">
                    {aff.referredCount}
                  </td>
                  <td className="px-6 py-4 align-middle font-mono text-xs">
                    <div className="text-gray-300 font-bold">{formatMZN(aff.totalDeposits)}</div>
                    <div className="text-[10px] text-gray-500">Comissão direta: {formatMZN(aff.depositCommissions)}</div>
                  </td>
                  <td className="px-6 py-4 align-middle font-mono text-xs">
                    <div className={`font-black ${aff.netEarnings >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                      {aff.netEarnings >= 0 ? '+' : ''}{formatMZN(aff.netEarnings)}
                    </div>
                    {aff.winDeductions !== 0 && (
                      <div className="text-[10px] text-red-500/70">Deduções vitórias: {formatMZN(aff.winDeductions)}</div>
                    )}
                    {aff.subCommissions > 0 && (
                      <div className="text-[10px] text-sky-400">Subafiliação: +{formatMZN(aff.subCommissions)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 align-middle font-mono text-xs">
                    <div className={`font-black text-sm ${aff.balance > 0 ? 'text-primary' : aff.balance < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                      {formatMZN(aff.balance)}
                    </div>
                    <div className="text-[10px] text-gray-400">Total Pago: {formatMZN(aff.totalPaid || 0)}</div>
                  </td>
                  <td className="px-6 py-4 align-middle text-xs">
                    <span className="font-bold text-white uppercase">{aff.saqueMethod}</span>
                    <span className="block text-[10px] text-emerald-400 font-bold">{aff.saqueName || "Sem Titular"}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-gray-400 font-mono">{cleanMocambiquePhone(aff.saqueNumber)}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-5 h-5 text-gray-400 hover:text-white p-0 cursor-pointer"
                        onClick={() => {
                          navigator.clipboard.writeText(cleanMocambiquePhone(aff.saqueNumber));
                          toast.success("Número de saque copiado!");
                        }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right align-middle">
                    <Button
                      onClick={() => router.push(`/admin/affiliates/${aff.id}`)}
                      size="sm"
                      className="h-8 bg-[#2A2F40] hover:bg-primary hover:text-black font-bold text-white transition-all border-none cursor-pointer"
                    >
                      Detalhes CRM
                    </Button>
                  </td>
                </tr>
              ))}

              {filteredAffiliates.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground font-medium">
                    Nenhum parceiro encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid para Mobile/Medium screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
        {filteredAffiliates.map((aff) => (
          <div key={aff.id} className="bg-[#101116] border border-[#2A2F40]/60 rounded-2xl p-4 space-y-3 shadow-md text-left text-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-bold text-white text-base block">{aff.name}</span>
                <span className="text-xs text-emerald-400 font-mono font-bold tracking-wider">{aff.code}</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  aff.is_active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                }`}>
                  {aff.is_active ? "Ativo" : "Banido"}
                </span>
                <span className={`text-lg font-black font-mono ${aff.balance > 0 ? 'text-primary' : aff.balance < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                  {formatMZN(aff.balance)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2A2F40]/30 text-xs font-mono">
              <div>
                <span className="text-gray-500 block">Ganhos Líquidos</span>
                <span className={`font-black ${aff.netEarnings >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                  {aff.netEarnings >= 0 ? '+' : ''}{formatMZN(aff.netEarnings)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Indicados</span>
                <span className="text-white font-bold text-base">{aff.referredCount}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[#2A2F40]/30 text-xs">
              <div className="flex flex-col text-left">
                <span className="text-[9px] text-emerald-400 font-bold">{aff.saqueName || "Sem Titular"}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-gray-400 font-mono">{cleanMocambiquePhone(aff.saqueNumber)}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-5 h-5 text-gray-400 hover:text-white p-0 cursor-pointer"
                    onClick={() => {
                      navigator.clipboard.writeText(cleanMocambiquePhone(aff.saqueNumber));
                      toast.success("Número de saque copiado!");
                    }}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <Button
                onClick={() => router.push(`/admin/affiliates/${aff.id}`)}
                size="sm"
                className="h-8 bg-[#2A2F40] hover:bg-primary hover:text-black font-bold text-xs text-white cursor-pointer"
              >
                Gerir CRM
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
