"use client";

import { useState, useMemo, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { format, subDays, startOfDay, parseISO, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { TrendingUp, TrendingDown, Wallet, Users, ArrowUpRight, ArrowDownRight, Activity, Link2, Percent } from "lucide-react";
import { formatMZN } from "@/lib/utils";

interface Props {
  depositsRaw: { created_at: string; amount: number }[];
  usersRaw: { created_at: string; balance: number }[];
  withdrawalsRaw: { created_at: string; amount: number }[];
  failedRaw?: { created_at: string; amount: number }[];
  usersCount?: number;
  initialTotalDeposits?: number;
  initialTotalWithdrawals?: number;
  initialTotalFailed?: number;
  initialFailedCount?: number;
  initialTotalRetained?: number;
  affiliateDeposits?: number;
  directDeposits?: number;
  totalAffiliateBalance?: number;
}

export function AdminCharts({ 
  depositsRaw: initialDeposits, 
  usersRaw: initialUsers, 
  withdrawalsRaw: initialWithdrawals, 
  failedRaw: initialFailed = [],
  usersCount: initialUsersCount = 0,
  initialTotalDeposits = 0,
  initialTotalWithdrawals = 0,
  initialTotalFailed = 0,
  initialFailedCount = 0,
  initialTotalRetained = 0,
  affiliateDeposits = 0,
  directDeposits = 0,
  totalAffiliateBalance = 0
}: Props) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [filter, setFilter] = useState<"hoje" | "7d" | "30d" | "tudo">("7d");
  const [deposits, setDeposits] = useState(initialDeposits);
  const [withdrawals, setWithdrawals] = useState(initialWithdrawals);
  const [failed, setFailed] = useState(initialFailed);
  const [users, setUsers] = useState(initialUsers);
  const [totalUsersCount, setTotalUsersCount] = useState(initialUsersCount || initialUsers.length);

  // Estados para os totais de cards gerais históricos
  const [totalDeposits, setTotalDeposits] = useState(initialTotalDeposits);
  const [totalWithdrawals, setTotalWithdrawals] = useState(initialTotalWithdrawals);
  const [totalFailed, setTotalFailed] = useState(initialTotalFailed);
  const [failedCount, setFailedCount] = useState(initialFailedCount);
  const [totalRetained, setTotalRetained] = useState(initialTotalRetained);

  // Subscrever ao Realtime para Gráficos e atualizar os totais acumulados dos cards
  useEffect(() => {
    const channel = supabase.channel('admin-charts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, payload => {
        if (payload.new.status === 'COMPLETED') {
           if (payload.new.type === 'DEPOSIT') {
             setDeposits(prev => [...prev, { created_at: payload.new.created_at, amount: payload.new.amount }]);
             setTotalDeposits(prev => prev + Number(payload.new.amount));
           } else if (payload.new.type === 'WITHDRAW' || payload.new.type === 'WITHDRAWAL') {
             setWithdrawals(prev => [...prev, { created_at: payload.new.created_at, amount: payload.new.amount }]);
             setTotalWithdrawals(prev => prev + Number(payload.new.amount));
           }
        } else if (payload.new.status === 'FAILED' && payload.new.type === 'DEPOSIT') {
             setFailed(prev => [...prev, { created_at: payload.new.created_at, amount: payload.new.amount }]);
             setTotalFailed(prev => prev + Number(payload.new.amount));
             setFailedCount(prev => prev + 1);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, payload => {
        setUsers(prev => [...prev, { created_at: payload.new.created_at, balance: payload.new.balance || 0 }]);
        setTotalUsersCount(prev => prev + 1);
        setTotalRetained(prev => prev + Number(payload.new.balance || 0));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'users' }, payload => {
        setTotalUsersCount(prev => Math.max(0, prev - 1));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialTotalDeposits, initialTotalWithdrawals, initialTotalFailed, initialFailedCount, initialTotalRetained]);

  const ggr = totalDeposits - totalWithdrawals; // Gross Gaming Revenue

  const chartData = useMemo(() => {
    const now = new Date();
    
    // Configuração de Períodos
    const daysToSub = filter === "hoje" ? 1 : filter === "7d" ? 7 : filter === "30d" ? 30 : 90;
    const startDate = startOfDay(subDays(now, daysToSub - 1));

    const dataMap = new Map<string, { date: string; displayDate: string; depositos: number; levantamentos: number; falhas: number; usuarios: number }>();
    
    if (filter === "hoje") {
      for (let i = 0; i <= 23; i++) {
        const key = `${i.toString().padStart(2, '0')}:00`;
        dataMap.set(key, { date: key, displayDate: key, depositos: 0, levantamentos: 0, falhas: 0, usuarios: 0 });
      }
    } else {
      for (let i = daysToSub - 1; i >= 0; i--) {
        const d = subDays(now, i);
        const key = format(d, "yyyy-MM-dd");
        dataMap.set(key, {
          date: key,
          displayDate: filter === "7d" ? format(d, "EEE", { locale: ptBR }).toUpperCase() : format(d, "dd MMM", { locale: ptBR }),
          depositos: 0,
          levantamentos: 0,
          falhas: 0,
          usuarios: 0
        });
      }
    }

    // Preencher Depósitos
    deposits.forEach(dep => {
      const d = parseISO(dep.created_at);
      if (filter === "hoje") {
        if (format(d, "yyyy-MM-dd") === format(now, "yyyy-MM-dd")) {
          const hourKey = `${format(d, "HH")}:00`;
          if (dataMap.has(hourKey)) dataMap.get(hourKey)!.depositos += Number(dep.amount);
        }
      } else {
        if (isAfter(d, startDate) || format(d, "yyyy-MM-dd") === format(startDate, "yyyy-MM-dd")) {
          const key = format(d, "yyyy-MM-dd");
          if (dataMap.has(key)) dataMap.get(key)!.depositos += Number(dep.amount);
        }
      }
    });

    // Preencher Levantamentos
    withdrawals.forEach(withd => {
      const d = parseISO(withd.created_at);
      if (filter === "hoje") {
        if (format(d, "yyyy-MM-dd") === format(now, "yyyy-MM-dd")) {
          const hourKey = `${format(d, "HH")}:00`;
          if (dataMap.has(hourKey)) dataMap.get(hourKey)!.levantamentos += Number(withd.amount);
        }
      } else {
        if (isAfter(d, startDate) || format(d, "yyyy-MM-dd") === format(startDate, "yyyy-MM-dd")) {
          const key = format(d, "yyyy-MM-dd");
          if (dataMap.has(key)) dataMap.get(key)!.levantamentos += Number(withd.amount);
        }
      }
    });

    // Preencher Falhas
    failed.forEach(fail => {
      const d = parseISO(fail.created_at);
      if (filter === "hoje") {
        if (format(d, "yyyy-MM-dd") === format(now, "yyyy-MM-dd")) {
          const hourKey = `${format(d, "HH")}:00`;
          if (dataMap.has(hourKey)) dataMap.get(hourKey)!.falhas += Number(fail.amount);
        }
      } else {
        if (isAfter(d, startDate) || format(d, "yyyy-MM-dd") === format(startDate, "yyyy-MM-dd")) {
          const key = format(d, "yyyy-MM-dd");
          if (dataMap.has(key)) dataMap.get(key)!.falhas += Number(fail.amount);
        }
      }
    });

    // Preencher Utilizadores
    users.forEach(u => {
      const d = parseISO(u.created_at);
      if (filter === "hoje") {
        if (format(d, "yyyy-MM-dd") === format(now, "yyyy-MM-dd")) {
          const hourKey = `${format(d, "HH")}:00`;
          if (dataMap.has(hourKey)) dataMap.get(hourKey)!.usuarios += 1;
        }
      } else {
        if (isAfter(d, startDate) || format(d, "yyyy-MM-dd") === format(startDate, "yyyy-MM-dd")) {
          const key = format(d, "yyyy-MM-dd");
          if (dataMap.has(key)) dataMap.get(key)!.usuarios += 1;
        }
      }
    });

    return Array.from(dataMap.values());
  }, [deposits, withdrawals, users, filter]);

  // Totais do período selecionado
  const periodDeposits = chartData.reduce((acc, curr) => acc + curr.depositos, 0);
  const periodWithdrawals = chartData.reduce((acc, curr) => acc + curr.levantamentos, 0);
  const periodGGR = periodDeposits - periodWithdrawals;

  return (
    <div className="space-y-6">
      
      {/* 5 Cards Principais - Estilo Stripe/Utmify */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Receita Bruta (Depósitos) */}
        <div className="bg-[#101116] border border-[#2A2F40] p-5 rounded-2xl flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <ArrowUpRight className="w-16 h-16 text-primary" />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Receita Bruta</span>
          </div>
          <div>
            <span className="text-3xl font-black text-white">{formatMZN(totalDeposits)}</span>
            <div className="flex items-center gap-2 mt-2">
               <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                 <TrendingUp className="w-3 h-3" /> Hoje
               </span>
               <span className="text-xs text-gray-500">Histórico Total</span>
            </div>
          </div>
        </div>

        {/* Card 2: Receita Líquida (GGR) */}
        <div className="bg-[#101116] border border-[#2A2F40] p-5 rounded-2xl flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-sky-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <Activity className="w-16 h-16 text-sky-500" />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500">
              <Activity className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lucro Operacional</span>
          </div>
          <div>
            <span className="text-3xl font-black text-white">{formatMZN(ggr)}</span>
            <div className="flex items-center gap-2 mt-2">
               <span className="text-xs font-bold text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                 GGR
               </span>
               <span className="text-xs text-gray-500">Depósitos - Levantamentos</span>
            </div>
          </div>
        </div>

        {/* Card 3: Passivo Retido */}
        <div className="bg-[#101116] border border-[#2A2F40] p-5 rounded-2xl flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-orange-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <Wallet className="w-16 h-16 text-orange-500" />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Passivo dos Clientes</span>
          </div>
          <div>
            <span className="text-3xl font-black text-white">{formatMZN(totalRetained)}</span>
            <div className="flex items-center gap-2 mt-2">
               <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                 Risco
               </span>
               <span className="text-xs text-gray-500">Saldos nas Contas</span>
            </div>
          </div>
        </div>

        {/* Card 4: Total de Utilizadores */}
        <div className="bg-[#101116] border border-[#2A2F40] p-5 rounded-2xl flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-purple-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <Users className="w-16 h-16 text-purple-500" />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Base de Utilizadores</span>
          </div>
          <div>
            <span className="text-3xl font-black text-white">{totalUsersCount.toLocaleString('pt-BR')} <span className="text-lg text-gray-500 font-medium">Contas</span></span>
            <div className="flex items-center gap-2 mt-2">
               <span className="text-xs font-bold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                 Total
               </span>
               <span className="text-xs text-gray-500">Registos Únicos</span>
            </div>
          </div>
        </div>

        {/* Card 5: Falhas Pendentes/Rejeitadas */}
        <div className="bg-[#101116] border border-[#2A2F40] p-5 rounded-2xl flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-red-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <ArrowDownRight className="w-16 h-16 text-red-500" />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
              <ArrowDownRight className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Falhas</span>
          </div>
          <div>
            <span className="text-3xl font-black text-white">{failedCount} <span className="text-lg text-gray-500 font-medium">Depósitos</span></span>
            <div className="flex items-center gap-2 mt-2">
               <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                 Total Perdas
               </span>
               <span className="text-xs text-gray-500">{formatMZN(totalFailed)} não creditado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Origem de Receita: Afiliados vs Direto */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Receita via Afiliados */}
        <div className="bg-[#101116] border border-[#2A2F40] p-5 rounded-2xl flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-amber-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <Percent className="w-16 h-16 text-amber-500" />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Percent className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Receita via Afiliados</span>
          </div>
          <div>
            <span className="text-3xl font-black text-white">{formatMZN(affiliateDeposits)}</span>
            <div className="flex items-center gap-2 mt-2">
               <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                 {totalDeposits > 0 ? `${((affiliateDeposits / totalDeposits) * 100).toFixed(1)}%` : '0%'}
               </span>
               <span className="text-xs text-gray-500">do total de depósitos</span>
            </div>
          </div>
        </div>

        {/* Receita Link Direto */}
        <div className="bg-[#101116] border border-[#2A2F40] p-5 rounded-2xl flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-cyan-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <Link2 className="w-16 h-16 text-cyan-500" />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
              <Link2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Receita Link Direto</span>
          </div>
          <div>
            <span className="text-3xl font-black text-white">{formatMZN(directDeposits)}</span>
            <div className="flex items-center gap-2 mt-2">
               <span className="text-xs font-bold text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                 {totalDeposits > 0 ? `${((directDeposits / totalDeposits) * 100).toFixed(1)}%` : '0%'}
               </span>
               <span className="text-xs text-gray-500">sem afiliado vinculado</span>
            </div>
          </div>
        </div>

        {/* Comissões Pendentes de Afiliados */}
        <div className="bg-[#101116] border border-[#2A2F40] p-5 rounded-2xl flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-rose-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <TrendingDown className="w-16 h-16 text-rose-500" />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Comissões Pendentes</span>
          </div>
          <div>
            <span className={`text-3xl font-black ${totalAffiliateBalance >= 0 ? 'text-white' : 'text-emerald-400'}`}>{formatMZN(totalAffiliateBalance)}</span>
            <div className="flex items-center gap-2 mt-2">
               <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                 Passivo
               </span>
               <span className="text-xs text-gray-500">saldo total afiliados</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controlos do Gráfico Principal */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-10 mb-2">
        <div>
          <h2 className="text-xl font-bold text-white">Fluxo de Caixa vs Levantamentos</h2>
          <p className="text-sm text-gray-400">Análise de volume transacional no período selecionado.</p>
        </div>
        <div className="flex bg-[#14161E] rounded-lg border border-[#2A2F40] p-1 flex-wrap">
          <button onClick={() => setFilter("hoje")} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filter === "hoje" ? "bg-primary text-black" : "text-gray-400 hover:text-white"}`}>Hoje</button>
          <button onClick={() => setFilter("7d")} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filter === "7d" ? "bg-primary text-black" : "text-gray-400 hover:text-white"}`}>7 Dias</button>
          <button onClick={() => setFilter("30d")} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filter === "30d" ? "bg-primary text-black" : "text-gray-400 hover:text-white"}`}>30 Dias</button>
          <button onClick={() => setFilter("tudo")} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filter === "tudo" ? "bg-primary text-black" : "text-gray-400 hover:text-white"}`}>Geral</button>
        </div>
      </div>

      {/* GRÁFICOS (Financeiro + Crescimento de Base) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* GRÁFICO FINANCEIRO (Área Dupla) */}
        <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col">
          <div className="flex flex-wrap gap-6 mb-8 border-b border-[#2A2F40] pb-6">
            <div>
               <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Volume Depósitos</span>
               <span className="text-2xl font-black text-primary">{formatMZN(periodDeposits)}</span>
            </div>
            <div>
               <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Volume Saídas</span>
               <span className="text-2xl font-black text-red-500">{formatMZN(periodWithdrawals)}</span>
            </div>
            <div>
               <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Lucro no Período (GGR)</span>
               <span className={`text-2xl font-black ${periodGGR >= 0 ? 'text-sky-400' : 'text-red-500'}`}>{formatMZN(periodGGR)}</span>
            </div>
          </div>
          
          <div className="w-full h-[350px]">
            {isMounted && (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDepositos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#28A745" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#28A745" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLevantamentos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorFalhas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2F40" vertical={false} />
                  <XAxis dataKey="displayDate" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `MZN ${val >= 1000 ? (val/1000).toFixed(1)+'k' : val}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1D27', borderColor: '#2A2F40', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }} 
                    itemStyle={{ fontWeight: 'bold' }} 
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area type="monotone" dataKey="depositos" name="Entradas (Depósitos)" stroke="#28A745" strokeWidth={3} fillOpacity={1} fill="url(#colorDepositos)" />
                  <Area type="monotone" dataKey="levantamentos" name="Saídas (Levantamentos)" stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#colorLevantamentos)" />
                  <Area type="monotone" dataKey="falhas" name="Falhas (Não creditado)" stroke="#F59E0B" strokeWidth={3} fillOpacity={1} fill="url(#colorFalhas)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* GRÁFICO DE UTILIZADORES (Crescimento "Estilo Aviator") */}
        <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col">
          <div className="flex flex-wrap gap-6 mb-8 border-b border-[#2A2F40] pb-6">
            <div>
               <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Novos Registos no Período</span>
               <span className="text-2xl font-black text-sky-400">{chartData.reduce((acc, curr) => acc + curr.usuarios, 0).toLocaleString()} <span className="text-lg font-medium text-gray-500">contas</span></span>
            </div>
            <div>
               <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Média Diária</span>
               <span className="text-2xl font-black text-purple-400">
                 {Math.ceil(users.length / 90).toLocaleString()} 
                 <span className="text-sm font-medium text-gray-500 ml-1">users/dia</span>
               </span>
            </div>
          </div>
          
          <div className="w-full h-[350px]">
            {isMounted && (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsuarios" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2F40" vertical={false} />
                  <XAxis dataKey="displayDate" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1D27', borderColor: '#2A2F40', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }} 
                    itemStyle={{ fontWeight: 'bold' }} 
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area type="monotone" dataKey="usuarios" name="Novas Contas" stroke="#0EA5E9" strokeWidth={4} fillOpacity={1} fill="url(#colorUsuarios)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
