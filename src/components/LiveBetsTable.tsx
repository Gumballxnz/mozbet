"use client";

import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";

// Motor Determinístico: Garante que todos os utilizadores vejam os mesmos
// resultados no mesmo exato segundo, sem sobrecarregar a API.
function generateDeterministicBets(count: number) {
  const now = Date.now();
  const currentSecond = Math.floor(now / 1000);
  const games = ["Aviator", "Mines", "Plinko", "Taxi Crash", "Lion Zama", "Mega Fruits"];
  const chars = "ABCDEF0123456789";
  
  const results = [];
  
  // Vamos gerar os "últimos" eventos baseados nos segundos anteriores
  for (let i = 0; i < count; i++) {
    // Usamos o segundo atual menos 'i' para criar uma seed única para este momento
    const seed = currentSecond - i;
    
    // Pseudo-aleatório baseado na seed
    const pseudoRandom = (Math.abs(Math.sin(seed * 9999)) * 10000) % 1;
    const pseudoRandom2 = (Math.abs(Math.cos(seed * 8888)) * 10000) % 1;
    const pseudoRandom3 = (Math.abs(Math.sin(seed * 7777)) * 10000) % 1;
    
    // ID Falso
    let fakeId = "";
    for (let j = 0; j < 4; j++) {
      fakeId += chars[Math.floor(((pseudoRandom * 100) + j) % chars.length)];
    }
    fakeId += "***";

    // Aposta base e Multiplicador
    const baseBets = [10, 20, 50, 100, 200, 500, 1000];
    const betAmount = baseBets[Math.floor(pseudoRandom * baseBets.length)];
    
    // Multiplicador (1.00x até 10.00x)
    const multiplier = Number((1.01 + pseudoRandom2 * 5).toFixed(2));
    
    // Matemática exata: Aposta * Multiplicador
    const payout = Number((betAmount * multiplier).toFixed(2));

    // Formatação de Hora (HH:MM:SS)
    const timeObj = new Date(seed * 1000);
    const timeStr = timeObj.toLocaleTimeString('pt-PT', { hour12: false });

    results.push({
      game: games[Math.floor(pseudoRandom3 * games.length)],
      id: fakeId,
      time: timeStr,
      betAmount,
      multiplier,
      payout,
      isNew: i === 0 // Marcar o mais recente para animação
    });
}
  
  return results;
}

export function LiveBetsTable() {
  const [activities, setActivities] = useState<any[]>([]);

  // Atualizar a cada 3.5 segundos para não fritar a CPU (Otimização Mobile)
  useEffect(() => {
    // Execução inicial
    setActivities(generateDeterministicBets(8));
    
    const interval = setInterval(() => {
      setActivities(prev => {
        const novo = generateDeterministicBets(1)[0];
        novo.isNew = true;
        // Marcar os antigos como não novos e remover o último para manter o tamanho 8
        const restos = prev.slice(0, 7).map(a => ({...a, isNew: false}));
        return [novo, ...restos];
      });
    }, 3500);
    
    return () => clearInterval(interval);
  }, []);

  if (activities.length === 0) return null;

  return (
    <div className="w-full mt-4 px-3">
      <div className="bg-[#0f1015] rounded-[20px] border border-white/5 overflow-hidden shadow-lg">
        {/* Cabeçalho Txunabet Style */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/40">
          <div className="flex gap-4">
            <h2 className="font-black text-white text-lg tracking-tight">Jogos instantâneos</h2>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="px-4 pt-3 pb-1 flex gap-2 overflow-x-auto no-scrollbar">
          <button className="bg-white/10 text-white font-bold text-xs px-4 py-2 rounded-lg whitespace-nowrap">Todas as apostas</button>
          <button className="text-muted-foreground font-bold text-xs px-4 py-2 hover:text-white transition-colors whitespace-nowrap">Maiores apostadores</button>
          <button className="text-muted-foreground font-bold text-xs px-4 py-2 hover:text-white transition-colors whitespace-nowrap">Maiores premiados</button>
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
              {activities.map((act, i) => (
                <tr 
                  key={`${act.time}-${act.id}-${i}`} 
                  className={`group transition-all duration-500 ease-in-out ${act.isNew ? 'bg-emerald-500/10' : 'hover:bg-white/[0.02]'}`}
                >
                  <td className="px-4 py-3">
                    <span className="font-bold text-white text-xs flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-primary/20 shrink-0"></div>
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
                      <BadgeCheck size={14} className="text-primary" />
                      <span className="text-xs font-bold text-gray-300">
                        {act.id}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-white flex items-center gap-1">
                      <span className="text-[9px] bg-primary/20 text-primary px-1 rounded font-black">MT</span>
                      {act.betAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold text-xs">
                      x{act.multiplier.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-black text-emerald-400 flex items-center justify-end gap-1">
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 rounded font-black">MT</span>
                      {act.payout.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
