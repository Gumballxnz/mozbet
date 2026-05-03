"use client";

import { useEffect, useState, useRef } from "react";
import { BadgeCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { socket } from "@/lib/socket";
import { GAMES } from "@/lib/games";

// Mostrar apenas ID Mascarado (Sincronizado com o Chat)
function maskId(username: string): string {
  if (!username) return "USER***";
  const cleanId = username.includes("-") ? username.split("-")[0] : username;
  if (/^\d/.test(cleanId)) {
    return "MZ" + cleanId.slice(0, 3).toUpperCase() + "***";
  }
  return cleanId.slice(0, 4).toUpperCase() + "***";
}

export function LiveBetsTable() {
  const [activities, setActivities] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "high_rollers" | "biggest_wins">("all");
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    // Solicitar o fluxo atual de apostas mal o componente estiver pronto
    socket.emit("request_live_bets");

    socket.on("initial_live_bets", (history) => {
      if (isMounted.current) {
        setActivities(history);
      }
    });

    // Escutar o fluxo global contínuo
    socket.on("live_bet", (fakeBet) => {
      if (isMounted.current) {
        setActivities(prev => {
          const newArr = [fakeBet, ...prev];
          return newArr.slice(0, 15);
        });
      }
    });
    
    // 2. Ouvir o servidor Supabase para Apostas Reais verdadeiras da plataforma
    const channel = supabase.channel('live-bets-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bets' }, async (payload) => {
         const bet = payload.new;
         if (isMounted.current) {
           // Busca o nome e banner do jogo real da nossa lista local para ser rápido
           const game = GAMES.find(g => g.id === bet.game_id) || { name: bet.game_id, banner: `/api/img/banner-${bet.game_id}` };
           
           const realBet = {
               game: game.name,
               gameIcon: game.banner,
               id: bet.user_id.split('-')[0].toUpperCase(), // ID real formatado e anonimizado
               time: new Date(bet.created_at).toLocaleTimeString('pt-PT', {hour12: false}),
               betAmount: bet.amount,
               multiplier: bet.multiplier || (bet.payout > 0 ? (bet.payout/bet.amount) : 1.00),
               payout: bet.payout || 0,
               isLoss: (bet.payout || 0) === 0,
               isNew: true,
               isReal: true // Flag mantida apenas no modelo de dados
           };
           setActivities(prev => [realBet, ...prev].slice(0, 15));
         }
      })
      .subscribe();

    return () => {
      isMounted.current = false;
      socket.off("live_bet");
      supabase.removeChannel(channel);
    };
  }, []);

  if (activities.length === 0) return null;

  // Filtragem e Ordenação com base na Tab ativa
  const getDisplayData = () => {
    if (activeTab === "high_rollers") {
      return [...activities].sort((a, b) => b.betAmount - a.betAmount).slice(0, 8);
    }
    if (activeTab === "biggest_wins") {
      return [...activities].sort((a, b) => b.payout - a.payout).slice(0, 8);
    }
    return activities.slice(0, 8);
  };

  const displayData = getDisplayData();

  return (
    <div className="w-full mt-4 px-3">
      <div className="bg-[#0f1015] rounded-[20px] border border-white/5 overflow-hidden shadow-lg">
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/40">
          <div className="flex gap-4">
            <h2 className="font-black text-white text-lg tracking-tight">Jogos instantâneos</h2>
          </div>
        </div>
        
        {/* Tabs Funcionais */}
        <div className="px-4 pt-3 pb-1 flex gap-2 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab("all")}
            className={`${activeTab === "all" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"} font-bold text-xs px-4 py-2 rounded-lg whitespace-nowrap transition-colors`}
          >
            Todas as apostas
          </button>
          <button 
            onClick={() => setActiveTab("high_rollers")}
            className={`${activeTab === "high_rollers" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"} font-bold text-xs px-4 py-2 rounded-lg whitespace-nowrap transition-colors`}
          >
            Maiores apostadores
          </button>
          <button 
            onClick={() => setActiveTab("biggest_wins")}
            className={`${activeTab === "biggest_wins" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"} font-bold text-xs px-4 py-2 rounded-lg whitespace-nowrap transition-colors`}
          >
            Maiores premiados
          </button>
        </div>
        
        <div className="overflow-x-auto no-scrollbar mt-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] md:text-[11px] text-muted-foreground font-bold whitespace-nowrap">
                <th className="px-2 md:px-4 py-3 font-medium">Jogo</th>
                <th className="px-2 md:px-4 py-3 font-medium hidden md:table-cell">Hora</th>
                <th className="px-2 md:px-4 py-3 font-medium">Utilizador</th>
                <th className="px-2 md:px-4 py-3 font-medium">Aposta</th>
                <th className="px-2 md:px-4 py-3 font-medium text-center">Mult</th>
                <th className="px-2 md:px-4 py-3 font-medium text-right">Pagamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayData.map((act, i) => (
                <tr 
                  key={`${act.time}-${act.id}-${i}`} 
                  className={`group transition-all duration-500 ease-in-out ${act.isNew && activeTab === "all" ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}
                >
                  <td className="px-2 md:px-4 py-2 md:py-3 max-w-[80px] md:max-w-none truncate">
                    <span className="font-bold text-white text-[10px] md:text-xs flex items-center gap-1.5 md:gap-2">
                      <div className="hidden md:block w-5 h-5 rounded overflow-hidden bg-white/5 shrink-0">
                        <img 
                          src={act.gameIcon} 
                          alt={act.game}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full bg-primary/20 rounded"></div>';
                          }}
                        />
                      </div>
                      <span className="truncate">{act.game}</span>
                    </span>
                  </td>
                  <td className="px-2 md:px-4 py-2 md:py-3 hidden md:table-cell">
                    <span className="text-xs font-medium text-muted-foreground">
                      {act.time}
                    </span>
                  </td>
                  <td className="px-2 md:px-4 py-2 md:py-3">
                    <div className="flex items-center gap-1 md:gap-1.5">
                      <BadgeCheck size={12} className={`md:w-[14px] md:h-[14px] ${act.isLoss ? "text-muted-foreground" : "text-primary"}`} />
                      <span className="text-[10px] md:text-xs font-bold text-gray-300">
                        {maskId(act.id)}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 md:px-4 py-2 md:py-3">
                    <span className="text-[10px] md:text-xs font-medium text-white flex items-center gap-1">
                      <span className="hidden md:inline text-[9px] bg-white/10 text-gray-400 px-1 rounded font-black">MT</span>
                      {act.betAmount.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                    </span>
                  </td>
                  <td className="px-1 md:px-4 py-2 md:py-3 text-center">
                    {act.isLoss ? (
                      <span className="inline-block px-1 md:px-2 py-0.5 rounded bg-white/5 text-gray-500 font-bold text-[9px] md:text-xs">
                        x{act.multiplier.toFixed(2)}
                      </span>
                    ) : (
                      <span className="inline-block px-1 md:px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold text-[9px] md:text-xs">
                        x{act.multiplier.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="px-2 md:px-4 py-2 md:py-3 text-right">
                    {act.isLoss ? (
                      <span className="text-[10px] md:text-xs font-bold text-gray-500 flex items-center justify-end gap-1">
                        -
                      </span>
                    ) : (
                      <span className="text-[10px] md:text-xs font-black text-emerald-400 flex items-center justify-end gap-0.5 md:gap-1">
                        <span className="hidden md:inline text-[9px] bg-emerald-500/20 text-emerald-400 px-1 rounded font-black">MT</span>
                        {act.payout.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                      </span>
                    )}
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
