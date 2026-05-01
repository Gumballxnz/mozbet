"use client";

import { useEffect, useState } from "react";
import { Users, TrendingUp, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useAppStore } from "@/lib/store";

interface StatsData {
  online: number;
  isReal: boolean;
  deposits: Array<{ id: string; amount: number; time: string }>;
  withdrawals: Array<{ id: string; amount: number; game: string; time: string }>;
}

export function LiveStatsTicker() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const { isLoggedIn } = useAppStore();

  useEffect(() => {
    // Buscar stats a cada 10 segundos
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/game/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Erro ao buscar stats", err);
      }
    };

    // Fazer heartbeat para presença a cada 30 segundos se estiver logado
    const heartbeat = async () => {
      if (isLoggedIn) {
        try {
          await fetch("/api/game/stats", { method: "POST" });
        } catch (err) {}
      }
    };

    fetchStats();
    heartbeat();

    // Aumentado os intervalos massivamente para não sobrecarregar o dispositivo (Otimização Mobile)
    const statsInterval = setInterval(fetchStats, 30000); // 30s
    const hbInterval = setInterval(heartbeat, 60000); // 60s

    return () => {
      clearInterval(statsInterval);
      clearInterval(hbInterval);
    };
  }, [isLoggedIn]);

  if (!stats) return null;

  // Memoizar para evitar repaints gigantes e limiter para máx 15 itens
  const allEvents = Array.from({ length: 1 }).map(() => {
    return [
      ...stats.deposits.map(d => ({ ...d, type: "deposit" as const, game: undefined })),
      ...stats.withdrawals.map(w => ({ ...w, type: "withdrawal" as const }))
    ].sort(() => Math.random() - 0.5).slice(0, 15);
  })[0];

  return (
    <div className="fixed top-16 left-0 right-0 z-[120] pointer-events-none">
      <div className="bg-black/60 backdrop-blur-md border-y border-white/10 py-1.5 flex items-center shadow-lg">
        {/* Contagem Online */}
        <div className="flex items-center gap-2 px-4 border-r border-white/10 shrink-0">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <Users size={12} className="text-gray-400" />
          <span className="text-[10px] font-black text-white">
            {stats.online} <span className="text-gray-500 font-bold ml-1 hidden sm:inline">ONLINE</span>
          </span>
          {stats.isReal && (
            <span className="bg-red-500/20 text-red-500 text-[8px] px-1.5 rounded uppercase font-bold ml-1">Real (Admin)</span>
          )}
        </div>

        {/* Marquee de Entradas e Saídas */}
        <div className="flex-1 overflow-hidden relative">
          <div className="flex gap-8 animate-[scroll_30s_linear_infinite] whitespace-nowrap px-4">
            {allEvents.map((ev, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {ev.type === "deposit" ? (
                  <>
                    <ArrowDownLeft size={12} className="text-blue-400" />
                    <span className="text-[10px] font-bold text-gray-400">{ev.id} entrou com</span>
                    <span className="text-[10px] font-black text-blue-400">{ev.amount} MT</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight size={12} className="text-emerald-400" />
                    <span className="text-[10px] font-bold text-gray-400">{ev.id} sacou</span>
                    <span className="text-[10px] font-black text-emerald-400">{ev.amount} MT</span>
                    {ev.game && <span className="text-[9px] text-gray-500">({ev.game})</span>}
                  </>
                )}
                <span className="text-[8px] text-gray-600 ml-1">{ev.time}</span>
              </div>
            ))}
            
            {/* Duplicar para scroll contínuo */}
            {allEvents.map((ev, i) => (
              <div key={`dup-${i}`} className="flex items-center gap-1.5">
                {ev.type === "deposit" ? (
                  <>
                    <ArrowDownLeft size={12} className="text-blue-400" />
                    <span className="text-[10px] font-bold text-gray-400">{ev.id} entrou com</span>
                    <span className="text-[10px] font-black text-blue-400">{ev.amount} MT</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight size={12} className="text-emerald-400" />
                    <span className="text-[10px] font-bold text-gray-400">{ev.id} sacou</span>
                    <span className="text-[10px] font-black text-emerald-400">{ev.amount} MT</span>
                    {ev.game && <span className="text-[9px] text-gray-500">({ev.game})</span>}
                  </>
                )}
                <span className="text-[8px] text-gray-600 ml-1">{ev.time}</span>
              </div>
            ))}
          </div>
          
          {/* Fades nas bordas */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/60 to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/60 to-transparent z-10" />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}} />
    </div>
  );
}
