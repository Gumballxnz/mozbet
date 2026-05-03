"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { socket, joinRoom, leaveRoom } from "@/lib/socket";
import { playSound } from "@/lib/sounds";

interface Props {
  balance: number;
  onUpdateBalance: (b: number) => void;
  onBack: () => void;
}

// Fakes para o painel de apostas do Spribe
const FAKE_USERS = ["1***4", "6***4", "6***7", "s***8", "s***2", "j***3", "m***a"];
function generateRoundFakes(roundMult: number) {
  const fakes = [];
  const count = 15 + Math.floor(Math.random() * 20); // 15 a 35 apostadores
  for (let i = 0; i < count; i++) {
    const bet = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000][Math.floor(Math.random() * 9)];
    const cashedAt = Math.random() < 0.3 ? 0 : Number((Math.random() * (roundMult - 1.01) + 1.01).toFixed(2));
    fakes.push({
      user: FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)],
      bet,
      cashedAt: cashedAt > 0 ? cashedAt : null,
      win: cashedAt > 0 ? Number((bet * cashedAt).toFixed(2)) : 0
    });
  }
  return fakes.sort((a, b) => b.bet - a.bet);
}

// Componente da Caixa de Aposta Individual
const BetBox = ({ 
  phase, multiplier, balance, onBet, onCashout, 
  cashedOut, hasBet, lastWin, activeBetAmount 
}: any) => {
  const [betAmount, setBetAmount] = useState(10);
  const presets = [32, 80, 160, 800];
  
  return (
    <div className="flex-1 bg-[#1A1D27] rounded-2xl border border-[#2A2F40] p-2 flex flex-col gap-2">
      <div className="flex justify-between">
        <div className="flex items-center gap-2 bg-[#101116] rounded-full px-4 py-1.5 border border-[#2A2F40]">
          <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Aposta</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="text-[11px] text-gray-500 font-bold uppercase">Automático</span>
        </div>
      </div>
      
      <div className="flex gap-2">
        <div className="flex-[1.5] flex flex-col gap-1.5">
          <div className="flex items-center bg-[#101116] rounded-xl border border-[#2A2F40] h-12 px-1">
            <button onClick={() => setBetAmount(Math.max(10, betAmount - 10))} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white bg-[#272B3A] font-bold">−</button>
            <input type="number" value={betAmount} onChange={(e) => setBetAmount(Math.max(10, Number(e.target.value)))} className="flex-1 w-0 text-center text-white font-bold text-lg bg-transparent outline-none" />
            <button onClick={() => setBetAmount(betAmount + 10)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white bg-[#272B3A] font-bold">+</button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {presets.map(v => (
              <button key={v} onClick={() => setBetAmount(v)} className="bg-[#101116] border border-[#2A2F40] rounded-lg py-1 text-[11px] font-bold text-gray-400 hover:bg-[#272B3A] hover:text-white transition-colors">{v}</button>
            ))}
          </div>
        </div>

        <div className="flex-[2.5]">
          {!hasBet && !cashedOut && (
            <button 
              onClick={() => onBet(betAmount)}
              disabled={phase !== "waiting"}
              className={`w-full h-full rounded-2xl flex flex-col items-center justify-center border-b-[4px] transition-all
                ${phase === "waiting" ? 'bg-[#28A745] hover:bg-[#218838] border-[#1E7E34] text-white cursor-pointer' : 'bg-[#1e2330] border-[#131722] text-gray-500 cursor-not-allowed opacity-80'}`}
            >
              <span className="text-xl font-black uppercase tracking-tight shadow-black/20 text-shadow-sm">Aposta</span>
              {phase === "waiting" && <span className="text-sm font-bold opacity-90">{betAmount.toFixed(2)} MZN</span>}
            </button>
          )}

          {hasBet && !cashedOut && (
            <button 
              onClick={onCashout}
              disabled={phase !== "rising"}
              className="w-full h-full rounded-2xl flex flex-col items-center justify-center border-b-[4px] transition-all bg-[#D35400] hover:bg-[#E67E22] border-[#A04000] text-white"
            >
              <span className="text-xl font-black uppercase tracking-tight shadow-black/20 text-shadow-sm">Sacar</span>
              <span className="text-lg font-bold opacity-90">{(activeBetAmount * multiplier).toFixed(2)} MZN</span>
            </button>
          )}

          {cashedOut && (
            <div className="w-full h-full rounded-2xl flex flex-col items-center justify-center bg-[#28A745]/20 border-2 border-[#28A745]/50">
              <span className="text-xs font-bold text-[#28A745] uppercase tracking-wider">Sacas-te</span>
              <span className="text-xl font-black text-[#28A745]">+{lastWin.toFixed(2)} MZN</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AviatorGame = ({ balance, onUpdateBalance, onBack }: Props) => {
  const { isLoggedIn } = useAppStore();
  const [phase, setPhase] = useState<"waiting" | "rising" | "crashed" | "loading">("loading");
  const [multiplier, setMultiplier] = useState(1.0);
  const [countdown, setCountdown] = useState(5);
  const [history, setHistory] = useState<number[]>([]);
  
  // Estado das apostas reias
  const [betsState, setBetsState] = useState([
    { hasBet: false, cashedOut: false, lastWin: 0, betAmount: 10 },
    { hasBet: false, cashedOut: false, lastWin: 0, betAmount: 10 }
  ]);

  // Lista da Esquerda
  const [roundFakes, setRoundFakes] = useState<any[]>([]);

  const currentRoundId = useRef<string | null>(null);
  const startedAt = useRef<number>(0);
  const animationRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const fetchRoundState = useCallback(async () => {
    try {
      const res = await fetch("/api/game/round?game=aviator");
      const data = await res.json();
      if (!data.round) return;
      currentRoundId.current = data.round.id;
      const startMs = new Date(data.round.startedAt).getTime();
      const now = Date.now();
      
      // Fix UTC Timeout Infinity: Se o startMs estiver incrivelmente atrasado (mais de 1 minuto), assumimos que o fuso horário falhou
      if (Math.abs(startMs - now) > 60000 && data.round.status === "rising") {
         startedAt.current = now - 5000; // Fake elapsed time seguro
      } else {
         startedAt.current = startMs;
      }

      if (data.round.status === "waiting") {
        setPhase("waiting");
        setMultiplier(1.0);
        setBetsState(prev => prev.map(b => ({ ...b, hasBet: false, cashedOut: false })));
        setCountdown(Math.max(1, Math.ceil((startMs - now) / 1000)));
        setRoundFakes(generateRoundFakes(0));
      } else if (data.round.status === "crashed") {
        setPhase("crashed");
        setMultiplier(data.round.crashPoint || 1.0);
        setRoundFakes(generateRoundFakes(data.round.crashPoint || 1.0));
      } else {
        setPhase("rising");
        setRoundFakes(generateRoundFakes(9999));
      }
    } catch (err) {}
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/game/history?game=aviator&limit=30");
      const data = await res.json();
      if (data.history) setHistory(data.history.map((h: any) => h.crashPoint));
    } catch (err) {}
  }, []);

  useEffect(() => {
    fetchRoundState();
    fetchHistory();
    
    joinRoom("game_aviator");

    const handleUpdate = (data: any) => {
      if (data.game !== "aviator") return;
      currentRoundId.current = data.round_id;

      if (data.status === "waiting") {
        playSound('notification');
        setPhase("waiting");
        setMultiplier(1.0);
        setBetsState(prev => prev.map(b => ({ ...b, hasBet: false, cashedOut: false })));
        const startMs = new Date(data.started_at).getTime();
        setCountdown(Math.max(1, Math.ceil((startMs - Date.now()) / 1000)));
        setRoundFakes(generateRoundFakes(0));
      } else if (data.status === "running") {
        setPhase("rising");
        const startMs = new Date(data.started_at).getTime();
        // Sincronização de tempo com o servidor
        startedAt.current = startMs;
        setRoundFakes(generateRoundFakes(9999));
      } else if (data.status === "crashed") {
        playSound('crash');
        setPhase("crashed");
        const crashP = Number(data.crash_point);
        setMultiplier(crashP);
        setRoundFakes(generateRoundFakes(crashP));
        fetchHistory();
        
        // Força perdas para quem não sacou
        setBetsState(prev => prev.map(b => ({
          ...b, 
          hasBet: b.hasBet && !b.cashedOut ? false : b.hasBet
        })));
      }
    };

    socket.on("game_update", handleUpdate);

    return () => {
      socket.off("game_update", handleUpdate);
      leaveRoom("game_aviator");
    };
  }, [fetchRoundState, fetchHistory]);

  // Loop do Multiplicador
  useEffect(() => {
    if (phase === "waiting") {
      const timer = setInterval(() => setCountdown((c) => (c <= 1 ? 0 : c - 1)), 1000);
      return () => clearInterval(timer);
    }
    if (phase === "rising") {
      const updateMultiplier = () => {
        let elapsedMs = Date.now() - startedAt.current;
        if (elapsedMs < 0 || elapsedMs > 500000) elapsedMs = 0; // Fix Infinity

        if (elapsedMs > 0) {
          const calcMult = Math.min(Math.max(1.0, 1.0 * Math.exp(0.00006 * elapsedMs)), 50000);
          setMultiplier(parseFloat(calcMult.toFixed(2)));
        }
        animationRef.current = requestAnimationFrame(updateMultiplier);
      };
      animationRef.current = requestAnimationFrame(updateMultiplier);
      return () => cancelAnimationFrame(animationRef.current);
    }
  }, [phase]);

  const handleBet = async (boxIndex: number, amount: number) => {
    if (!isLoggedIn) { toast.error("Faça login para apostar!"); return; }
    if (phase !== "waiting") { toast.error("Aguarde a próxima ronda."); return; }
    if (amount > balance) { toast.error("Saldo insuficiente!"); return; }
    
    try {
      const res = await fetch("/api/game/crash/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betAmount: amount, gameId: "aviator" })
      });
      const data = await res.json();
      if (data.success) {
        setBetsState(prev => {
          const next = [...prev];
          next[boxIndex] = { ...next[boxIndex], hasBet: true, betAmount: amount };
          return next;
        });
        onUpdateBalance(data.newBalance);
        toast.success("Aposta aceite!");
      } else {
        toast.error(data.error || "Erro ao apostar");
      }
    } catch (err) {
      toast.error("Erro de conexão");
    }
  };

  const handleCashout = async (boxIndex: number) => {
    if (phase !== "rising") return;
    const box = betsState[boxIndex];
    if (!box.hasBet || box.cashedOut) return;
    
    try {
      const res = await fetch("/api/game/crash/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          betAmount: box.betAmount, 
          multiplier: multiplier, 
          gameId: "aviator" 
        })
      });
      const data = await res.json();
      if (data.success) {
        setBetsState(prev => {
          const next = [...prev];
          next[boxIndex] = { ...next[boxIndex], cashedOut: true, lastWin: data.winAmount };
          return next;
        });
        playSound('cashout');
        onUpdateBalance(data.newBalance);
        toast.success(`Sacou ${data.winAmount.toFixed(2)} MZN!`);
      } else {
        toast.error(data.error || "Erro no cashout");
      }
    } catch (err) {
      toast.error("Erro na retirada");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col lg:flex-row bg-[#0A0A0A] font-sans text-white">
      <div className="lg:hidden h-14 bg-[#1A1D27] flex items-center justify-between px-4 shrink-0 shadow-lg z-10 border-b border-white/5">
        <button onClick={onBack} className="text-gray-400 hover:text-white p-2 -ml-2"><ArrowLeft size={20} /></button>
        <span className="text-red-500 font-black italic text-xl tracking-tighter">Aviator</span>
      </div>

      {/* PAINEL ESQUERDO (Apostas Ronda - Desktop ou Tab) */}
      <div className="hidden lg:flex w-[320px] bg-[#14161E] border-r border-[#2A2F40] flex-col shrink-0 z-20">
        <div className="h-14 flex items-center gap-3 px-4 bg-[#1A1D27] border-b border-[#2A2F40]">
           <button onClick={onBack} className="text-gray-400 hover:text-white"><ArrowLeft size={20} /></button>
           <span className="text-red-500 font-black italic text-xl tracking-tighter">Aviator</span>
        </div>
        
        <div className="flex bg-[#101116] p-2 gap-1">
          <button className="flex-1 bg-[#1A1D27] text-white text-xs font-bold py-2 rounded-full border border-white/5">Apostas</button>
          <button className="flex-1 text-gray-400 text-xs font-bold py-2 hover:bg-white/5 rounded-full transition-colors">Anterior</button>
          <button className="flex-1 text-gray-400 text-xs font-bold py-2 hover:bg-white/5 rounded-full transition-colors">Topo</button>
        </div>

        <div className="px-4 py-3 bg-[#1A1D27] border-b border-black flex justify-between items-center">
          <span className="text-xs text-gray-400 font-bold">{roundFakes.length} Apostas</span>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#101116] no-scrollbar">
          <div className="grid grid-cols-3 text-[10px] uppercase font-bold text-gray-500 p-2 pl-4 sticky top-0 bg-[#101116]/90 backdrop-blur">
            <span>Jogador</span>
            <span className="text-center">Aposta MZN</span>
            <span className="text-right">Prémio MZN</span>
          </div>
          <div className="divide-y divide-[#1A1D27]">
            {roundFakes.map((f, i) => (
              <div key={i} className={`grid grid-cols-3 items-center p-2 pl-4 text-xs ${f.cashedAt ? 'bg-emerald-500/5' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#1A1D27] flex items-center justify-center border border-white/10 shrink-0">
                    <UserIcon size={12} className="text-gray-500" />
                  </div>
                  <span className="text-gray-300 font-medium truncate">{f.user}</span>
                </div>
                <div className="text-center font-mono-data text-gray-400">{f.bet.toFixed(2)}</div>
                <div className="text-right flex justify-end gap-2 items-center">
                  {f.cashedAt && <span className="bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded text-[10px] font-bold">{f.cashedAt}x</span>}
                  <span className={f.win > 0 ? "text-emerald-500 font-bold" : "text-gray-600"}>{f.win > 0 ? f.win.toFixed(2) : "-"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ÁREA CENTRAL E DIREITA */}
      <div className="flex-1 flex flex-col bg-[#101116]">
        <div className="hidden lg:flex h-14 bg-[#1A1D27] justify-end items-center px-6 border-b border-[#2A2F40]">
        </div>

        {/* HISTÓRICO DE RONDAS */}
        <div className="h-9 flex items-center px-2 bg-[#14161E] border-b border-[#2A2F40] shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex gap-1 min-w-max">
            {history.map((m, i) => {
               // Cores do histórico igual Spribe
               let col = "text-[#A117F2] bg-[#A117F2]/10 border-[#A117F2]/20"; // roxo normal
               if (m < 2.0) col = "text-[#3498DB] bg-[#3498DB]/10 border-[#3498DB]/20"; // azul para baixos
               if (m >= 10.0) col = "text-[#E91E63] bg-[#E91E63]/10 border-[#E91E63]/20"; // rosa para gigantes
               
               return (
                 <span key={i} className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${col}`}>
                   {m.toFixed(2)}x
                 </span>
               )
            })}
          </div>
        </div>

        {/* TELA CENTRAL DO JOGO */}
        <div className="flex-1 flex flex-col p-2 lg:p-4 gap-2 lg:gap-4 overflow-hidden">
          
          {/* O CANVAS E O MULTIPLICADOR */}
          <div className="flex-1 relative bg-black rounded-3xl overflow-hidden border border-[#2A2F40] shadow-inner shadow-black flex items-center justify-center">
            
            {/* EFEITO DE LUZ DE FUNDO (Raios spribe) */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
               background: "radial-gradient(circle at 10% 90%, rgba(52, 152, 219, 0.4) 0%, transparent 60%)"
            }} />
            
            {/* O próprio Canvas foi omitido para dar lugar à Animação Visual CSS para melhor performance / look Spribe */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none p-4">
              {phase === "loading" && (
                <div className="w-12 h-12 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
              )}

              {phase === "waiting" && (
                <div className="flex flex-col items-center gap-1 animate-in fade-in">
                  <div className="text-red-600 font-extrabold text-3xl mb-2">✈️</div>
                  <div className="text-white text-lg tracking-widest font-normal">A AGUARDAR NOVA RONDADA</div>
                  <div className="text-gray-400 mt-2 font-mono">00:0{countdown}</div>
                  <div className="w-48 h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                     <div className="h-full bg-red-600 transition-all duration-1000 ease-linear" style={{ width: `${(countdown/5)*100}%` }} />
                  </div>
                </div>
              )}

              {phase === "rising" && (
                <div className="flex flex-col items-center justify-center animate-in zoom-in duration-300">
                  <span className="font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]" style={{ fontSize: "clamp(60px, 12vw, 120px)", lineHeight: 1 }}>
                    {multiplier.toFixed(2)}<span className="text-[0.7em]">x</span>
                  </span>
                  
                  {/* Avião CSS Animado em vez de canvas para ser idêntico e leve */}
                  <div className="absolute left-[10%] bottom-[20%] w-[80%] h-[60%] pointer-events-none overflow-hidden">
                     <svg viewBox="0 0 100 100" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                        <path d="M0 100 Q 40 100 90 20" fill="transparent" stroke="#E53935" strokeWidth="1.5" />
                        <path d="M0 100 Q 40 100 90 20 L 90 100 Z" fill="url(#grad)" />
                        <defs>
                          <linearGradient id="grad" x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stopColor="rgba(229, 57, 53, 0)" />
                            <stop offset="100%" stopColor="rgba(229, 57, 53, 0.4)" />
                          </linearGradient>
                        </defs>
                     </svg>
                     <div className="absolute w-12 h-12 text-3xl origin-center" style={{ left: '85%', top: '10%', transform: 'rotate(-25deg)' }}>✈️</div>
                  </div>
                </div>
              )}

              {phase === "crashed" && (
                <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in-95">
                  <span className="text-[#E53935] font-extrabold text-2xl lg:text-4xl uppercase tracking-tighter drop-shadow-md bg-black/60 px-6 py-2 rounded-xl">
                    Fugiu!
                  </span>
                  <span className="font-black text-[#E53935]" style={{ fontSize: "clamp(50px, 10vw, 90px)", lineHeight: 1 }}>
                    {multiplier.toFixed(2)}x
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* DOIS PAINEIS DE APOSTAS */}
          <div className="flex flex-col md:flex-row gap-2 lg:gap-4 shrink-0 h-auto md:h-[130px]">
             <BetBox 
               phase={phase} multiplier={multiplier} balance={balance} 
               onBet={(amt: number) => handleBet(0, amt)} onCashout={() => handleCashout(0)} 
               {...betsState[0]} activeBetAmount={betsState[0].betAmount} 
             />
             <BetBox 
               phase={phase} multiplier={multiplier} balance={balance} 
               onBet={(amt: number) => handleBet(1, amt)} onCashout={() => handleCashout(1)} 
               {...betsState[1]} activeBetAmount={betsState[1].betAmount} 
             />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AviatorGame;
