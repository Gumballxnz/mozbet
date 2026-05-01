"use client";

import { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { format, subDays, startOfDay, parseISO, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  depositsRaw: { created_at: string; amount: number }[];
  usersRaw: { created_at: string }[];
}

export function AdminCharts({ depositsRaw, usersRaw }: Props) {
  const [filter, setFilter] = useState<"7d" | "30d">("7d");

  const chartData = useMemo(() => {
    const daysToSub = filter === "7d" ? 7 : 30;
    const now = new Date();
    const startDate = startOfDay(subDays(now, daysToSub - 1));

    // Initialize array with days
    const dataMap = new Map<string, { date: string; displayDate: string; depositos: number; usuarios: number }>();
    
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

    // Populate Deposits
    depositsRaw.forEach(dep => {
      const d = parseISO(dep.created_at);
      if (isAfter(d, startDate) || format(d, "yyyy-MM-dd") === format(startDate, "yyyy-MM-dd")) {
        const key = format(d, "yyyy-MM-dd");
        if (dataMap.has(key)) {
          const existing = dataMap.get(key)!;
          existing.depositos += Number(dep.amount);
        }
      }
    });

    // Populate Users
    usersRaw.forEach(u => {
      const d = parseISO(u.created_at);
      if (isAfter(d, startDate) || format(d, "yyyy-MM-dd") === format(startDate, "yyyy-MM-dd")) {
        const key = format(d, "yyyy-MM-dd");
        if (dataMap.has(key)) {
          const existing = dataMap.get(key)!;
          existing.usuarios += 1;
        }
      }
    });

    return Array.from(dataMap.values());
  }, [depositsRaw, usersRaw, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-white">Análise de Desempenho</h2>
        <div className="flex bg-[#14161E] rounded-lg border border-[#2A2F40] p-1">
          <button 
            onClick={() => setFilter("7d")}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filter === "7d" ? "bg-primary text-black" : "text-gray-400 hover:text-white"}`}
          >
            Últimos 7 Dias
          </button>
          <button 
            onClick={() => setFilter("30d")}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filter === "30d" ? "bg-primary text-black" : "text-gray-400 hover:text-white"}`}
          >
            Últimos 30 Dias
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICO DE RECEITAS */}
        <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="mb-6">
            <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">Volume de Depósitos (MZN)</h3>
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
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1D27', borderColor: '#2A2F40', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#28A745', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="depositos" name="Depósitos" stroke="#28A745" strokeWidth={3} fillOpacity={1} fill="url(#colorDepositos)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO DE REGISTOS */}
        <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="mb-6">
            <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">Novos Utilizadores</h3>
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
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1D27', borderColor: '#2A2F40', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#0EA5E9', fontWeight: 'bold' }}
                  cursor={{ fill: '#1A1D27' }}
                />
                <Bar dataKey="usuarios" name="Registos" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
