"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Menu, MessageCircle, Heart } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

interface Props {
  balance: number;
  onUpdateBalance: (b: number) => void;
  onBack: () => void;
}

const AviatorGame = ({ balance, onUpdateBalance, onBack }: Props) => {
  const { isLoggedIn } = useAppStore();
  const [phase, setPhase] = useState<"waiting" | "rising" | "crashed" | "loading">("loading");
  const [multiplier, setMultiplier] = useState(1.0);
  const [countdown, setCountdown] = useState(5);
  const [history, setHistory] = useState<number[]>([]);
  
  // Apostas
  const [betAmount, setBetAmount] = useState(10);
  const [activeBetId, setActiveBetId] = useState<string | null>(null);
  const [hasBet, setHasBet] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [lastWin, setLastWin] = useState(0);

  const currentRoundId = useRef<string | null>(null);
  const startedAt = useRef<number>(0);
  const animationRef = useRef<number>(0);
  
  // ==========================================
  // SINCRONIZAÇÃO COM O SERVIDOR
  // ==========================================

  const fetchRoundState = useCallback(async () => {
    try {
      const res = await fetch("/api/game/round?game=aviator");
      const data = await res.json();
      
      if (!data.round) return;

      currentRoundId.current = data.round.id;
      const startMs = new Date(data.round.startedAt).getTime();
      const now = Date.now();

      if (data.round.status === "waiting") {
        setPhase("waiting");
        setMultiplier(1.0);
        setHasBet(false);
        setCashedOut(false);
        setCountdown(Math.max(1, Math.ceil((startMs - now) / 1000)));
      } else if (data.round.status === "crashed") {
        setPhase("crashed");
        setMultiplier(data.round.crashPoint || 1.0);
      } else {
        setPhase("rising");
        startedAt.current = startMs;
      }
    } catch (err) {
      console.error("Erro ao sincronizar ronda:", err);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/game/history?game=aviator&limit=15");
      const data = await res.json();
      if (data.history) {
        setHistory(data.history.map((h: any) => h.crashPoint));
      }
    } catch (err) {}
  }, []);

  // Inicialização e subscrição Realtime
  useEffect(() => {
    fetchRoundState();
    fetchHistory();

    // Subscrever a alterações na tabela game_rounds via Supabase Realtime
    const channel = supabase
      .channel("public:game_rounds")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_rounds", filter: "game_id=eq.aviator" },
        (payload) => {
          const round = payload.new;
          currentRoundId.current = round.id;
          
          if (round.status === "waiting") {
            setPhase("waiting");
            setMultiplier(1.0);
            setHasBet(false);
            setCashedOut(false);
            const startMs = new Date(round.started_at).getTime();
            setCountdown(Math.max(1, Math.ceil((startMs - Date.now()) / 1000)));
          } else if (round.status === "running") {
            setPhase("rising");
            startedAt.current = new Date(round.started_at).getTime();
          } else if (round.status === "crashed") {
            setPhase("crashed");
            setMultiplier(Number(round.crash_point));
            fetchHistory(); // Atualizar histórico
            
            // Se o utilizador tinha aposta ativa e não sacou, perdeu.
            if (hasBet && !cashedOut) {
              setHasBet(false);
            }
          }
        }
      )
      .subscribe();

    // Fallback: Polling caso o realtime falhe em redes fracas
    const pollInterval = setInterval(fetchRoundState, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [fetchRoundState, fetchHistory, hasBet, cashedOut]);

  // ==========================================
  // LOOP VISUAL DO JOGO (100% Sincronizado)
  // ==========================================
  
  useEffect(() => {
    if (phase === "waiting") {
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) return 0;
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }

    if (phase === "rising") {
      const updateMultiplier = () => {
        const elapsedMs = Date.now() - startedAt.current;
        if (elapsedMs > 0) {
          // Fórmula universal determinística (todos vêem o mesmo)
          const calcMult = Math.max(1.0, 1.0 * Math.exp(0.00006 * elapsedMs));
          setMultiplier(parseFloat(calcMult.toFixed(2)));
        }
        animationRef.current = requestAnimationFrame(updateMultiplier);
      };
      
      animationRef.current = requestAnimationFrame(updateMultiplier);
      return () => cancelAnimationFrame(animationRef.current);
    }
  }, [phase]);

  // ==========================================
  // ACÇÕES DO JOGADOR
  // ==========================================

  const handleBet = async () => {
    if (!isLoggedIn) {
      toast.error("Faça login para apostar real!");
      return;
    }

    if (phase !== "waiting") {
      toast.error("Aguarde a próxima ronda.");
      return;
    }

    if (betAmount > balance) {
      toast.error("Saldo insuficiente!");
      return;
    }

    try {
      const res = await fetch("/api/game/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId: currentRoundId.current, amount: betAmount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActiveBetId(data.bet.id);
      setHasBet(true);
      onUpdateBalance(data.newBalance);
      toast.success("Aposta aceite!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao apostar.");
    }
  };

  const handleCashout = async () => {
    if (phase !== "rising" || !hasBet || cashedOut) return;

    try {
      // Pedimos o cashout para o multiplicador atual visto na tela
      const res = await fetch("/api/game/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId: currentRoundId.current, multiplier }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        // Se o servidor recusar, significa que o crash já aconteceu
        setPhase("crashed");
        setHasBet(false);
        throw new Error(data.error);
      }

      setCashedOut(true);
      setLastWin(data.winnings);
      onUpdateBalance(data.newBalance);
      toast.success(`Sacou ${data.winnings.toLocaleString()} MZN!`);
    } catch (err: any) {
      toast.error(err.message || "Muito tarde! Avião voou.");
    }
  };

  // ==========================================
  // RENDERIZAÇÃO
  // ==========================================

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col font-sans">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-3 bg-[#1B1F2D] border-b border-[#2A2F40]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-8 h-8 rounded-full bg-[#2A2F40] flex items-center justify-center text-white active:scale-95">
            <ArrowLeft size={18} />
          </button>
          <img src="/api/img/banner-aviator" className="h-6 object-contain rounded" alt="Logo" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-400 font-bold tracking-wider">SALDO</span>
            <span className="text-sm font-extrabold text-green-500">{balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} MT</span>
          </div>
          <button className="w-8 h-8 rounded-full bg-[#2A2F40] flex items-center justify-center text-white">
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* Histórico */}
      <div className="h-8 bg-[#161925] flex items-center gap-2 px-2 overflow-x-auto hide-scrollbar">
        <div className="flex gap-2 min-w-max">
          {history.map((m, i) => (
            <span key={i} className={`text-xs font-bold px-2 py-0.5 rounded bg-[#1B1F2D] ${m < 2 ? "text-blue-400" : m < 10 ? "text-purple-400" : "text-pink-400"}`}>
              {m.toFixed(2)}x
            </span>
          ))}
        </div>
      </div>

      {/* Área do Jogo Principal */}
      <div className="flex-1 relative bg-[#0D1018] overflow-hidden flex flex-col justify-center items-center">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }} />

        {/* Mensagem central */}
        {phase === "waiting" && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-20">
            <h2 className="text-red-500 font-extrabold text-2xl tracking-widest animate-pulse">
              A DECOLAR EM
            </h2>
            <div className="text-4xl font-black text-white mt-2">
              00:0{countdown}
            </div>
          </div>
        )}

        {phase === "crashed" && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-20">
            <h2 className="text-red-500 font-extrabold text-3xl tracking-widest">VOOU PARA LONGE!</h2>
            <div className="text-5xl font-black text-red-500 mt-2">{multiplier.toFixed(2)}x</div>
          </div>
        )}

        {phase === "rising" && (
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-center z-20">
            <div className="text-6xl font-black text-white tracking-tighter drop-shadow-lg" style={{ color: multiplier > 2 ? "#EAB308" : "#fff" }}>
              {multiplier.toFixed(2)}x
            </div>
          </div>
        )}

        {/* Avião Animado */}
        <div className="absolute bottom-8 left-8 w-full h-full pointer-events-none z-10 flex items-end">
          <Plane
            size={phase === "crashed" ? 0 : 80}
            className={`text-red-500 fill-red-500 transition-all ${
              phase === "waiting" ? "opacity-100" : phase === "crashed" ? "opacity-0 scale-50" : ""
            }`}
            style={{
              transform: phase === "rising" 
                ? `translate(${Math.min(multiplier * 20, 200)}px, -${Math.min(multiplier * 30, 300)}px) rotate(-15deg)`
                : "none",
              transition: phase === "rising" ? "transform 0.1s linear" : "all 0.5s ease-out"
            }}
          />
          {/* Rastro do avião */}
          {phase === "rising" && (
            <svg className="absolute bottom-10 left-10 w-[500px] h-[500px] overflow-visible -z-10">
              <path
                d={`M 0,0 Q 50,-50 ${Math.min(multiplier * 20, 200)},-${Math.min(multiplier * 30, 300)}`}
                fill="none"
                stroke="rgba(239, 68, 68, 0.4)"
                strokeWidth="8"
                className="animate-pulse"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Controlos de Aposta (Apenas 1 por enquanto para mobile) */}
      <div className="h-[200px] bg-[#161925] rounded-t-3xl border-t border-[#2A2F40] p-4 pb-8 flex flex-col gap-3">
        <div className="flex gap-2">
          <button className="flex-1 h-10 rounded-xl bg-red-600/20 text-red-500 font-extrabold text-sm border border-red-600/50">MANUAL</button>
          <button className="flex-1 h-10 rounded-xl bg-[#2A2F40] text-gray-400 font-extrabold text-sm">AUTO</button>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de valor */}
          <div className="flex-1 bg-[#0D1018] rounded-xl flex items-center justify-between px-2 h-14 border border-[#2A2F40]">
            <button onClick={() => setBetAmount(Math.max(10, betAmount - 10))} className="w-10 h-10 rounded-lg bg-[#2A2F40] flex items-center justify-center text-white font-bold">-</button>
            <div className="flex flex-col items-center">
              <span className="text-xl font-extrabold text-white">{betAmount}</span>
              <span className="text-[10px] text-gray-400 font-bold">MZN</span>
            </div>
            <button onClick={() => setBetAmount(betAmount + 10)} className="w-10 h-10 rounded-lg bg-[#2A2F40] flex items-center justify-center text-white font-bold">+</button>
          </div>

          {/* Botão de Ação */}
          <div className="flex-[1.2]">
            {!hasBet && !cashedOut && (
              <button
                onClick={handleBet}
                disabled={phase !== "waiting"}
                className="w-full h-14 rounded-xl bg-green-500 text-white font-black text-lg shadow-[0_4px_0_0_#166534] active:translate-y-1 active:shadow-none disabled:opacity-50 transition-all flex flex-col items-center justify-center leading-tight"
              >
                <span>APOSTAR</span>
                <span className="text-[10px] opacity-80 font-bold">{betAmount.toFixed(2)} MZN</span>
              </button>
            )}

            {hasBet && !cashedOut && (
              <button
                onClick={handleCashout}
                disabled={phase !== "rising"}
                className="w-full h-14 rounded-xl bg-[#EAB308] text-white font-black text-lg shadow-[0_4px_0_0_#854D0E] active:translate-y-1 active:shadow-none disabled:opacity-50 transition-all flex flex-col items-center justify-center leading-tight animate-pulse"
              >
                <span>SAQUE</span>
                <span className="text-xs">{(betAmount * multiplier).toFixed(2)} MZN</span>
              </button>
            )}

            {cashedOut && (
              <div className="w-full h-14 rounded-xl bg-[#2A2F40] border border-green-500/50 flex flex-col items-center justify-center text-green-500">
                <span className="text-xs font-bold">GANHOU</span>
                <span className="text-lg font-black">+{lastWin.toFixed(2)} MZN</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AviatorGame;
