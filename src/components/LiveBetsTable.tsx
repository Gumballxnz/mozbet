"use client";

import { useEffect, useState, useRef } from "react";
import { BadgeCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

const GAME_INFO: Record<string, { name: string, icon: string }> = {
  "aviator": { name: "Aviator", icon: "aviator" },
  "mines": { name: "Mines", icon: "mines" },
  "plinko": { name: "Plinko", icon: "plinko" },
  "taxi-crash": { name: "Taxi Crash", icon: "taxi-crash" },
  "lion-zama": { name: "Lion Zama", icon: "lion-zama" },
  "mega-fruits": { name: "Mega Fruits", icon: "mega-fruits" }
};

// IDs Partilhados com o Chat
const SHARED_FAKE_IDS = [
  "A8B2C4F1", "F9D3E2A0", "B7C1D9F4", "E4A2B5C1", "D1F8E3A2",
  "C5B4A1F9", "8F2D1A3B", "3C9E4B1F", "2A5B8C1D", "1E7F3D2A"
];

function generateDeterministicBets(count: number, excludeAviator: boolean = false) {
  const now = Date.now();
  const currentSecond = Math.floor(now / 1000);
  let gameKeys = Object.keys(GAME_INFO);
  if (excludeAviator) {
    gameKeys = gameKeys.filter(k => k !== "aviator");
  }
  
  const results = [];
  
  for (let i = 0; i < count; i++) {
    const seed = currentSecond - i;
    const pseudoRandom = (Math.abs(Math.sin(seed * 9999)) * 10000) % 1;
    const pseudoRandom2 = (Math.abs(Math.cos(seed * 8888)) * 10000) % 1;
    const pseudoRandom3 = (Math.abs(Math.sin(seed * 7777)) * 10000) % 1;
    
    const fakeId = SHARED_FAKE_IDS[Math.floor(pseudoRandom * SHARED_FAKE_IDS.length)];

    const baseBets = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
    const betAmount = baseBets[Math.floor(pseudoRandom * baseBets.length)];
    
    // 25% de probabilidade de perda natural
    const isLoss = pseudoRandom2 < 0.25;
    
    const multiplier = Number((1.01 + pseudoRandom2 * 19).toFixed(2));
    let payout = 0;
    if (!isLoss) {
      payout = Number((betAmount * multiplier).toFixed(2));
    }

    const timeObj = new Date(seed * 1000);
    const timeStr = timeObj.toLocaleTimeString('pt-PT', { hour12: false });
    const gameKey = gameKeys[Math.floor(pseudoRandom3 * gameKeys.length)];
    const game = GAME_INFO[gameKey];

    results.push({
      game: game.name,
      gameIcon: game.icon,
      id: fakeId,
      time: timeStr,
      betAmount,
      multiplier,
      payout,
      isLoss,
      isNew: i === 0,
      isReal: false
    });
  }
  
  return results;
}

// Quando o Aviator (ou outro jogo) crasha no servidor real, geramos apostas relacionadas com ele
function generateCrashFakes(gameId: string, realCrashPoint: number) {
  const results = [];
  const count = Math.floor(Math.random() * 3) + 1; // 1 a 3 fakes
  const game = GAME_INFO[gameId] || { name: gameId, icon: gameId };
  
  for (let i = 0; i < count; i++) {
    const fakeId = SHARED_FAKE_IDS[Math.floor(Math.random() * SHARED_FAKE_IDS.length)];
    const baseBets = [10, 50, 100, 200, 500];
    const betAmount = baseBets[Math.floor(Math.random() * baseBets.length)];
    
    // Alguém que sacou antes do crash, ou alguém que não sacou (perdeu)
    const isLoss = Math.random() < 0.3; // 30% perdem
    
    let multiplier = 0;
    let payout = 0;
    
    if (isLoss) {
      multiplier = realCrashPoint; // Ele crachou neste exato momento e o user perdeu
      payout = 0;
    } else {
      // O utilizador sacou num momento anterior ao crash
      multiplier = Number((Math.random() * (realCrashPoint - 1.01) + 1.01).toFixed(2));
      payout = Number((betAmount * multiplier).toFixed(2));
    }

    results.push({
      game: game.name,
      gameIcon: game.icon,
      id: fakeId,
      time: new Date().toLocaleTimeString('pt-PT', { hour12: false }),
      betAmount,
      multiplier,
      payout,
      isLoss,
      isNew: true,
      isReal: false
    });
  }
  return results;
}

export function LiveBetsTable() {
  const [activities, setActivities] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "high_rollers" | "biggest_wins">("all");
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    // Início Misto (Determinístico sem Aviator para não poluir antes do realtime chegar)
    setActivities(generateDeterministicBets(15, true));
    
    // 1. Ouvir o servidor Supabase para Apostas Reais e Crash de Rondas
    const channel = supabase.channel('live-bets-sync')
      // Ouvir rondas que terminaram (para gerar fakes consistentes para o Aviator)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_rounds' }, (payload) => {
         const round = payload.new;
         if (round.status === 'crashed' && isMounted.current) {
            const crashMult = round.crash_point || 1.00;
            const newFakes = generateCrashFakes(round.game_id, crashMult);
            setActivities(prev => [...newFakes, ...prev].slice(0, 15));
         }
      })
      // Ouvir apostas reais de utilizadores de verdade na plataforma
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bets' }, (payload) => {
         const bet = payload.new;
         if (isMounted.current) {
           const game = GAME_INFO[bet.game_id] || { name: bet.game_id, icon: bet.game_id };
           const realBet = {
               game: game.name,
               gameIcon: game.icon,
               id: bet.user_id.split('-')[0].toUpperCase(), // ID real formatado e anonimizado
               time: new Date(bet.created_at).toLocaleTimeString('pt-PT', {hour12: false}),
               betAmount: bet.amount,
               multiplier: bet.multiplier || (bet.payout > 0 ? (bet.payout/bet.amount) : 1.00),
               payout: bet.payout || 0,
               isLoss: (bet.payout || 0) === 0,
               isNew: true,
               isReal: true // Flag de destaque (opcional para estilo)
           };
           setActivities(prev => [realBet, ...prev].slice(0, 15));
         }
      })
      .subscribe();
    
    // 2. Fallback Determinístico (Preenche de forma cadenciada jogos "Offline" como Mines, Plinko)
    const interval = setInterval(() => {
      if (isMounted.current) {
        setActivities(prev => {
          const novo = generateDeterministicBets(1, true)[0]; // Não gera Aviator aqui, deixa pro DB
          novo.isNew = true;
          const restos = prev.slice(0, 14).map(a => ({...a, isNew: false}));
          return [novo, ...restos];
        });
      }
    }, 4500);
    
    return () => {
      isMounted.current = false;
      supabase.removeChannel(channel);
      clearInterval(interval);
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
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="text-[11px] text-muted-foreground font-bold">
                <th className="px-4 py-3 font-medium">Jogo</th>
                <th className="px-4 py-3 font-medium">Hora</th>
                <th className="px-4 py-3 font-medium">Utilizador</th>
                <th className="px-4 py-3 font-medium">Valor da aposta</th>
                <th className="px-4 py-3 font-medium text-center">Multiplicador</th>
                <th className="px-4 py-3 font-medium text-right">Pagamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayData.map((act, i) => (
                <tr 
                  key={`${act.time}-${act.id}-${i}`} 
                  className={`group transition-all duration-500 ease-in-out ${act.isNew && activeTab === "all" ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}
                >
                  <td className="px-4 py-3">
                    <span className="font-bold text-white text-xs flex items-center gap-2">
                      <div className="w-5 h-5 rounded overflow-hidden bg-white/5 shrink-0">
                        <img 
                          src={`/api/img/banner-${act.gameIcon}`} 
                          alt={act.game}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full bg-primary/20 rounded"></div>';
                          }}
                        />
                      </div>
                      {act.game}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-muted-foreground">
                      {act.time}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <BadgeCheck size={14} className={act.isLoss ? "text-muted-foreground" : "text-primary"} />
                      <span className="text-xs font-bold text-gray-300">
                        {act.id}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-white flex items-center gap-1">
                      <span className="text-[9px] bg-white/10 text-gray-400 px-1 rounded font-black">MT</span>
                      {act.betAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {act.isLoss ? (
                      <span className="inline-block px-2 py-0.5 rounded bg-white/5 text-gray-500 font-bold text-xs">
                        x{act.multiplier.toFixed(2)}
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold text-xs">
                        x{act.multiplier.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {act.isLoss ? (
                      <span className="text-xs font-bold text-gray-500 flex items-center justify-end gap-1">
                        -
                      </span>
                    ) : (
                      <span className="text-xs font-black text-emerald-400 flex items-center justify-end gap-1">
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 rounded font-black">MT</span>
                        {act.payout.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
