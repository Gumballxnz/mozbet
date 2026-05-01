"use client";

import { useState, useMemo, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, subDays, startOfDay, parseISO, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";

interface Props {
  depositsRaw: { created_at: string; amount: number }[];
  usersRaw: { created_at: string; balance: number }[];
}

export function AdminCharts({ depositsRaw: initialDeposits, usersRaw: initialUsers }: Props) {
  const [filter, setFilter] = useState<"hoje" | "7d" | "30d" | "tudo">("7d");
  const [deposits, setDeposits] = useState(initialDeposits);
  const [users, setUsers] = useState(initialUsers);

  // Subscrever ao Realtime para Gráficos
  useEffect(() => {
    const channel = supabase.channel('admin-charts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: 'type=eq.DEPOSIT' }, payload => {
        if (payload.new.status === 'COMPLETED') {
           setDeposits(prev => [...prev, { created_at: payload.new.created_at, amount: payload.new.amount }]);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, payload => {
        setUsers(prev => [...prev, { created_at: payload.new.created_at, balance: payload.new.balance || 0 }]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Totais Acumulados Absolutos
  const acumuladoDepositos = useMemo(() => deposits.reduce((acc, curr) => acc + Number(curr.amount), 0), [deposits]);
  const acumuladoUsuarios = users.length;
  const acumuladoRetido = useMemo(() => users.reduce((acc, curr) => acc + Number(curr.balance || 0), 0), [users]);

  const chartData = useMemo(() => {
    const now = new Date();
    
    // Se "tudo", descobrimos o dia do primeiro registo (ou assumimos 90 dias máximo para performance no gráfico)
    const daysToSub = filter === "hoje" ? 1 : filter === "7d" ? 7 : filter === "30d" ? 30 : 90;
    const startDate = startOfDay(subDays(now, daysToSub - 1));

    const dataMap = new Map<string, { date: string; displayDate: string; depositos: number; usuarios: number }>();
    
    if (filter === "hoje") {
      // Para "hoje", vamos agrupar por horas do dia
      for (let i = 0; i <= 23; i++) {
        const key = `${i.toString().padStart(2, '0')}:00`;
        dataMap.set(key, { date: key, displayDate: key, depositos: 0, usuarios: 0 });
      }
    } else {
      for (let i = daysToSub - 1; i >= 0; i--) {
        const d = subDays(now, i);
        const key = format(d, "yyyy-MM-dd");
        dataMap.set(key, {
          date: key,
          displayDate: filter === "7d" ? format(d, "EEEE", { locale: ptBR }) : format(d, "dd MMM", { locale: ptBR }),
          depositos: 0,
          usuarios: 0
        });
      }
    }

    // Populate Deposits
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

    // Populate Users
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
  }, [deposits, users, filter]);

  return (
    <div className="space-y-6">
      
      {/* Cards de Acumulados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#101116] border border-[#2A2F40] p-4 rounded-xl flex flex-col justify-center shadow-lg">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Total Histórico Depósitos</span>
          <span className="text-2xl font-black text-white glow-primary">{acumuladoDepositos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} MZN</span>
        </div>
        <div className="bg-[#101116] border border-[#2A2F40] p-4 rounded-xl flex flex-col justify-center shadow-lg">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Total Utilizadores</span>
          <span className="text-2xl font-black text-sky-500">{acumuladoUsuarios.toLocaleString("pt-BR")} Contas</span>
        </div>
        <div className="bg-[#101116] border border-[#2A2F40] p-4 rounded-xl flex flex-col justify-center shadow-lg">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Passivo Retido nas Contas</span>
          <span className="text-2xl font-black text-red-500">{acumuladoRetido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} MZN</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-8">
        <h2 className="text-xl font-bold text-white">Desempenho no Período</h2>
        <div className="flex bg-[#14161E] rounded-lg border border-[#2A2F40] p-1 flex-wrap">
          <button onClick={() => setFilter("hoje")} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filter === "hoje" ? "bg-primary text-black" : "text-gray-400 hover:text-white"}`}>Hoje</button>
          <button onClick={() => setFilter("7d")} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filter === "7d" ? "bg-primary text-black" : "text-gray-400 hover:text-white"}`}>7 Dias</button>
          <button onClick={() => setFilter("30d")} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filter === "30d" ? "bg-primary text-black" : "text-gray-400 hover:text-white"}`}>30 Dias</button>
          <button onClick={() => setFilter("tudo")} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filter === "tudo" ? "bg-primary text-black" : "text-gray-400 hover:text-white"}`}>Geral</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICO DE RECEITAS */}
        <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="mb-6">
            <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">Volume de Depósitos ({filter.toUpperCase()})</h3>
            <p className="text-2xl font-black text-white glow-primary">
              {chartData.reduce((acc, curr) => acc + curr.depositos, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDepositos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#28A745" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#28A745" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2F40" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `MZN ${val >= 1000 ? (val/1000).toFixed(1)+'k' : val}`} />
                <Tooltip contentStyle={{ backgroundColor: '#1A1D27', borderColor: '#2A2F40', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#28A745', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="depositos" name="Depósitos" stroke="#28A745" strokeWidth={3} fillOpacity={1} fill="url(#colorDepositos)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO DE REGISTOS */}
        <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="mb-6">
            <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">Novos Utilizadores ({filter.toUpperCase()})</h3>
            <p className="text-2xl font-black text-sky-500">
              {chartData.reduce((acc, curr) => acc + curr.usuarios, 0).toLocaleString()}
            </p>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2F40" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1A1D27', borderColor: '#2A2F40', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#0EA5E9', fontWeight: 'bold' }} cursor={{ fill: '#1A1D27' }} />
                <Bar dataKey="usuarios" name="Registos" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
