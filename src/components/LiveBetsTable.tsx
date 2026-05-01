"use client";

import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";

// Motor Determinístico: Garante que todos os utilizadores vejam os mesmos resultados
function generateDeterministicBets(count: number) {
  const now = Date.now();
  const currentSecond = Math.floor(now / 1000);
  const games = [
    { name: "Aviator", icon: "aviator" },
    { name: "Mines", icon: "mines" },
    { name: "Plinko", icon: "plinko" },
    { name: "Taxi Crash", icon: "taxi-crash" },
    { name: "Lion Zama", icon: "lion-zama" },
    { name: "Mega Fruits", icon: "mega-fruits" }
  ];
  const chars = "ABCDEF0123456789";
  const results = [];
  
  for (let i = 0; i < count; i++) {
    const seed = currentSecond - i;
    const pseudoRandom = (Math.abs(Math.sin(seed * 9999)) * 10000) % 1;
    const pseudoRandom2 = (Math.abs(Math.cos(seed * 8888)) * 10000) % 1;
    const pseudoRandom3 = (Math.abs(Math.sin(seed * 7777)) * 10000) % 1;
    
    // ID Falso (sempre ID estilo user, não telefone)
    let fakeId = "";
    for (let j = 0; j < 8; j++) {
      fakeId += chars[Math.floor(((pseudoRandom * 100) + j) % chars.length)];
    }

    const baseBets = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
    const betAmount = baseBets[Math.floor(pseudoRandom * baseBets.length)];
    
    // 25% de probabilidade de PERDA (para o site não parecer falso de que toda gente ganha)
    const isLoss = pseudoRandom2 < 0.25;
    
    let multiplier = 0;
    let payout = 0;
    
    if (!isLoss) {
      // Ganho: 1.01x a 20.00x
      multiplier = Number((1.01 + pseudoRandom2 * 19).toFixed(2));
      payout = Number((betAmount * multiplier).toFixed(2));
    }

    const timeObj = new Date(seed * 1000);
    const timeStr = timeObj.toLocaleTimeString('pt-PT', { hour12: false });
    const game = games[Math.floor(pseudoRandom3 * games.length)];

    results.push({
      game: game.name,
      gameIcon: game.icon,
      id: fakeId,
      time: timeStr,
      betAmount,
      multiplier,
      payout,
      isLoss,
      isNew: i === 0
    });
  }
  
  return results;
}

export function LiveBetsTable() {
  const [activities, setActivities] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "high_rollers" | "biggest_wins">("all");

  useEffect(() => {
    setActivities(generateDeterministicBets(15));
    
    const interval = setInterval(() => {
      setActivities(prev => {
        const novo = generateDeterministicBets(1)[0];
        novo.isNew = true;
        const restos = prev.slice(0, 14).map(a => ({...a, isNew: false}));
        return [novo, ...restos];
      });
    }, 3500);
    
    return () => clearInterval(interval);
  }, []);

  if (activities.length === 0) return null;

  // Filtragem e Ordenação com base na Tab ativa
  const getDisplayData = () => {
    if (activeTab === "high_rollers") {
      // Maiores Apostadores (ordena por valor da aposta)
      return [...activities].sort((a, b) => b.betAmount - a.betAmount).slice(0, 8);
    }
    if (activeTab === "biggest_wins") {
      // Maiores Premiados (ordena por pagamento)
      return [...activities].sort((a, b) => b.payout - a.payout).slice(0, 8);
    }
    // Todas as Apostas (ordem cronológica normal)
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
                            // Fallback caso não encontre a imagem
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
                        0.00x
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
