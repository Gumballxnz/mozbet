"use client";

import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";

export function LiveBetsTable() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/game/stats");
        const data = await res.json();
        
        if (data.withdrawals) {
          // Add a fake multiplier and bet amount just for visuals
          const formatted = data.withdrawals.map((w: any) => {
            const multiplier = (Math.random() * 5 + 1.2).toFixed(2);
            const betAmount = (w.amount / Number(multiplier)).toFixed(2);
            return {
              ...w,
              multiplier,
              betAmount
            };
          });
          setActivities(formatted);
        }
      } catch (err) {
        console.error("Erro ao carregar LiveBetsTable:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading && activities.length === 0) return null;

  return (
    <div className="w-full mt-4 px-3">
      <div className="bg-[#121212] rounded-[20px] border border-white/5 overflow-hidden shadow-lg">
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
          <h2 className="font-black text-white text-lg tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            AO VIVO
          </h2>
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest px-2 py-1 bg-white/5 rounded-full">
            Últimos Ganhos
          </div>
        </div>
        
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-black/40 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                <th className="px-4 py-3 font-medium">Jogo</th>
                <th className="px-4 py-3 font-medium">Jogador</th>
                <th className="px-4 py-3 font-medium">Aposta</th>
                <th className="px-4 py-3 font-medium text-center">Multiplicador</th>
                <th className="px-4 py-3 font-medium text-right">Ganho</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {activities.map((act, i) => (
                <tr 
                  key={i} 
                  className="group hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-extrabold text-white text-sm">
                      {act.game}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <BadgeCheck size={14} className="text-primary" />
                      <span className="text-sm font-bold text-gray-300">
                        {act.id}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-400">
                      {Number(act.betAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} MT
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-black text-xs">
                      {act.multiplier}x
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-black text-primary">
                      {act.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} MT
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
