"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Menu } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

interface Props {
  balance: number;
  onUpdateBalance: (b: number) => void;
  onBack: () => void;
}

// ===================================================================
// AVIATOR — Visual Profissional Inspirado no Spribe
// A lógica de jogo (backend sync, apostas, cashout) é preservada.
// ===================================================================

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
  const [autoCashout, setAutoCashout] = useState<number | null>(null);
  const [isAutoBet, setIsAutoBet] = useState(false);

  const currentRoundId = useRef<string | null>(null);
  const startedAt = useRef<number>(0);
  const animationRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // ==========================================
  // SINCRONIZAÇÃO COM O SERVIDOR (Preservada)
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
      const res = await fetch("/api/game/history?game=aviator&limit=20");
      const data = await res.json();
      if (data.history) {
        setHistory(data.history.map((h: any) => h.crashPoint));
      }
    } catch (err) {}
  }, []);

  useEffect(() => {
    fetchRoundState();
    fetchHistory();
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
            fetchHistory();
            if (hasBet && !cashedOut) setHasBet(false);
          }
        }
      )
      .subscribe();
    const pollInterval = setInterval(fetchRoundState, 3000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [fetchRoundState, fetchHistory, hasBet, cashedOut]);

  // ==========================================
  // LOOP VISUAL + CANVAS CURVA
  // ==========================================
  
  useEffect(() => {
    if (phase === "waiting") {
      const timer = setInterval(() => {
        setCountdown((c) => (c <= 1 ? 0 : c - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
    if (phase === "rising") {
      const updateMultiplier = () => {
        const elapsedMs = Date.now() - startedAt.current;
        if (elapsedMs > 0) {
          const calcMult = Math.max(1.0, 1.0 * Math.exp(0.00006 * elapsedMs));
          setMultiplier(parseFloat(calcMult.toFixed(2)));
        }
        animationRef.current = requestAnimationFrame(updateMultiplier);
      };
      animationRef.current = requestAnimationFrame(updateMultiplier);
      return () => cancelAnimationFrame(animationRef.current);
    }
  }, [phase]);

  // Auto-cashout
  useEffect(() => {
    if (phase === "rising" && hasBet && !cashedOut && autoCashout && multiplier >= autoCashout) {
      handleCashout();
    }
  }, [multiplier, phase, hasBet, cashedOut, autoCashout]);

  // Desenhar curva no Canvas (estilo Spribe)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    // Grelha de fundo subtil
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    if (phase === "rising" || phase === "crashed") {
      const maxMult = Math.max(multiplier, 2);
      const progress = Math.min((multiplier - 1) / (maxMult - 1), 1);
      
      // Pontos da curva
      const startX = 40;
      const startY = h - 40;
      const endX = startX + (w - 80) * Math.min(progress * 1.2, 1);
      const endY = startY - (h - 80) * Math.min(progress, 1);
      
      // Área preenchida por baixo da curva (gradiente vermelho)
      const gradient = ctx.createLinearGradient(0, h, 0, 0);
      gradient.addColorStop(0, "rgba(229, 57, 53, 0.0)");
      gradient.addColorStop(0.5, "rgba(229, 57, 53, 0.15)");
      gradient.addColorStop(1, "rgba(229, 57, 53, 0.3)");
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      // Curva exponencial via Bezier
      const cp1x = startX + (endX - startX) * 0.6;
      const cp1y = startY;
      const cp2x = endX - (endX - startX) * 0.1;
      const cp2y = endY + (startY - endY) * 0.2;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
      ctx.lineTo(endX, startY);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Linha da curva (vermelha brilhante)
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
      ctx.strokeStyle = phase === "crashed" ? "#666" : "#E53935";
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Ponto brilhante na ponta
      if (phase === "rising") {
        ctx.beginPath();
        ctx.arc(endX, endY, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#E53935";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(endX, endY, 12, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(229, 57, 53, 0.3)";
        ctx.fill();
      }

      // Desenhar o avião na ponta da curva
      if (phase === "rising") {
        ctx.save();
        ctx.translate(endX, endY);
        ctx.rotate(-0.4); // Inclinação do avião
        ctx.font = "28px serif";
        ctx.fillText("✈️", -14, 8);
        ctx.restore();
      }
    }
  }, [multiplier, phase]);

  // ==========================================
  // ACÇÕES DO JOGADOR (Preservadas)
  // ==========================================

  const handleBet = async () => {
    if (!isLoggedIn) { toast.error("Faça login para apostar!"); return; }
    if (phase !== "waiting") { toast.error("Aguarde a próxima ronda."); return; }
    if (betAmount > balance) { toast.error("Saldo insuficiente!"); return; }
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
      const res = await fetch("/api/game/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId: currentRoundId.current, multiplier }),
      });
      const data = await res.json();
      if (!res.ok) {
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

  // Cor do multiplicador no histórico
  const getHistoryColor = (val: number) => {
    if (val < 1.5) return "text-sky-400";
    if (val < 2) return "text-blue-400";
    if (val < 3) return "text-violet-400";
    if (val < 5) return "text-purple-400";
    if (val < 10) return "text-fuchsia-400";
    return "text-pink-500";
  };

  const getHistoryBg = (val: number) => {
    if (val < 1.5) return "bg-sky-500/10 border-sky-500/20";
    if (val < 2) return "bg-blue-500/10 border-blue-500/20";
    if (val < 3) return "bg-violet-500/10 border-violet-500/20";
    if (val < 5) return "bg-purple-500/10 border-purple-500/20";
    if (val < 10) return "bg-fuchsia-500/10 border-fuchsia-500/20";
    return "bg-pink-500/10 border-pink-500/20";
  };

  // Cor do multiplicador principal
  const getMultiplierColor = () => {
    if (phase === "crashed") return "#999";
    if (multiplier < 2) return "#FFFFFF";
    if (multiplier < 5) return "#FBBF24";
    if (multiplier < 10) return "#F97316";
    return "#EF4444";
  };

  // Presets de valor rápido
  const betPresets = [10, 20, 50, 100, 200, 500];

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#101116" }}>
      {/* ===== HEADER ===== */}
      <div className="h-12 flex items-center justify-between px-3 shrink-0" style={{ background: "#1A1D27" }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white active:scale-95 transition-all" style={{ background: "#272B3A" }}>
            <ArrowLeft size={16} />
          </button>
          {/* Logo estilizado Aviator */}
          <div className="flex items-center gap-1.5">
            <span className="text-lg">✈️</span>
            <span className="font-black text-white text-sm tracking-wider">AVIATOR</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: "#272B3A" }}>
            <span className="text-gray-400 mr-1">MZN</span>
            <span className="text-primary font-black">{balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* ===== HISTÓRICO DE RONDAS ===== */}
      <div className="h-10 flex items-center px-2 overflow-x-auto shrink-0" style={{ background: "#14161E" }}>
        <div className="flex gap-1.5 min-w-max">
          {history.map((m, i) => (
            <span key={i} className={`text-[11px] font-extrabold px-2 py-1 rounded-full border ${getHistoryColor(m)} ${getHistoryBg(m)}`}>
              {m.toFixed(2)}x
            </span>
          ))}
        </div>
      </div>

      {/* ===== ÁREA PRINCIPAL DO JOGO ===== */}
      <div className="flex-1 relative overflow-hidden" style={{ background: "#101116" }}>
        {/* Canvas da curva */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ display: phase === "rising" || phase === "crashed" ? "block" : "none" }}
        />

        {/* Multiplicador Centralizado */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
          {phase === "loading" && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
              <span className="text-gray-500 text-xs font-bold">A conectar...</span>
            </div>
          )}

          {phase === "waiting" && (
            <div className="flex flex-col items-center gap-2 animate-in fade-in">
              <div className="text-gray-400 font-bold text-sm tracking-widest uppercase">Próxima Ronda</div>
              <div className="flex items-baseline gap-1">
                <span className="text-white font-black" style={{ fontSize: "64px", lineHeight: 1 }}>
                  {countdown}
                </span>
                <span className="text-gray-500 text-lg font-bold">s</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-amber-500 text-xs font-bold tracking-wider">A PREPARAR VOO</span>
              </div>
            </div>
          )}

          {phase === "rising" && (
            <div className="flex flex-col items-center gap-1">
              <span 
                className="font-black tracking-tight transition-colors duration-300"
                style={{ 
                  fontSize: multiplier < 10 ? "72px" : "60px", 
                  lineHeight: 1,
                  color: getMultiplierColor(),
                  textShadow: `0 0 30px ${getMultiplierColor()}40`
                }}
              >
                {multiplier.toFixed(2)}x
              </span>
            </div>
          )}

          {phase === "crashed" && (
            <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in-95">
              <span className="text-red-500 font-extrabold text-sm tracking-[0.3em] uppercase">Voou Para Longe!</span>
              <span className="font-black text-gray-400" style={{ fontSize: "64px", lineHeight: 1 }}>
                {multiplier.toFixed(2)}x
              </span>
              {cashedOut && lastWin > 0 && (
                <div className="mt-3 px-6 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                  <span className="text-emerald-400 font-black text-xl">+{lastWin.toFixed(2)} MZN</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== PAINEL DE APOSTAS ===== */}
      <div className="shrink-0 p-3 pb-6 space-y-3" style={{ background: "#1A1D27" }}>
        {/* Presets de valor rápido */}
        <div className="flex gap-1.5 overflow-x-auto">
          {betPresets.map((v) => (
            <button
              key={v}
              onClick={() => setBetAmount(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                betAmount === v
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : "text-gray-400 border border-transparent hover:text-white"
              }`}
              style={{ background: betAmount === v ? undefined : "#272B3A" }}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Controlo de valor + Botão de acção */}
        <div className="flex items-center gap-3">
          {/* Selector de valor */}
          <div className="flex-1 flex items-center rounded-xl h-14 px-2 border" style={{ background: "#101116", borderColor: "#2A2F40" }}>
            <button 
              onClick={() => setBetAmount(Math.max(10, betAmount - 10))}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-lg active:scale-95"
              style={{ background: "#272B3A" }}
            >−</button>
            <div className="flex-1 text-center">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(10, Number(e.target.value)))}
                className="w-full text-center text-xl font-black text-white bg-transparent outline-none"
              />
              <span className="text-[10px] text-gray-500 font-bold">MZN</span>
            </div>
            <button 
              onClick={() => setBetAmount(betAmount + 10)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-lg active:scale-95"
              style={{ background: "#272B3A" }}
            >+</button>
          </div>

          {/* Botão de Ação Principal */}
          <div className="flex-[1.3]">
            {!hasBet && !cashedOut && (
              <button
                onClick={handleBet}
                disabled={phase !== "waiting"}
                className="w-full h-14 rounded-xl font-black text-white text-lg transition-all active:translate-y-0.5 disabled:opacity-40 disabled:active:translate-y-0 flex flex-col items-center justify-center leading-tight"
                style={{
                  background: phase === "waiting" 
                    ? "linear-gradient(180deg, #4CAF50 0%, #388E3C 100%)" 
                    : "#333",
                  boxShadow: phase === "waiting" ? "0 4px 0 0 #1B5E20, 0 6px 20px rgba(76,175,80,0.3)" : "none",
                }}
              >
                <span>APOSTAR</span>
                <span className="text-[10px] opacity-80 font-bold">{betAmount.toFixed(2)} MZN</span>
              </button>
            )}

            {hasBet && !cashedOut && (
              <button
                onClick={handleCashout}
                disabled={phase !== "rising"}
                className="w-full h-14 rounded-xl font-black text-white text-lg transition-all active:translate-y-0.5 disabled:opacity-40 flex flex-col items-center justify-center leading-tight animate-pulse"
                style={{
                  background: "linear-gradient(180deg, #F59E0B 0%, #D97706 100%)",
                  boxShadow: "0 4px 0 0 #92400E, 0 6px 20px rgba(245,158,11,0.3)",
                }}
              >
                <span>SACAR</span>
                <span className="text-xs font-bold">{(betAmount * multiplier).toFixed(2)} MZN</span>
              </button>
            )}

            {cashedOut && (
              <div className="w-full h-14 rounded-xl border border-emerald-500/50 flex flex-col items-center justify-center" style={{ background: "#1A2E1F" }}>
                <span className="text-[10px] font-bold text-emerald-400 tracking-wider">GANHOU</span>
                <span className="text-lg font-black text-emerald-400">+{lastWin.toFixed(2)} MZN</span>
              </div>
            )}
          </div>
        </div>

        {/* Auto-Cashout */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] text-gray-500 font-bold shrink-0">AUTO-SACAR:</span>
          <input
            type="number"
            placeholder="Desligado"
            step="0.1"
            min="1.1"
            value={autoCashout || ""}
            onChange={(e) => setAutoCashout(e.target.value ? Number(e.target.value) : null)}
            className="flex-1 h-7 rounded-lg px-2 text-xs font-bold text-white bg-transparent border outline-none text-center"
            style={{ borderColor: "#2A2F40", background: "#101116" }}
          />
          <span className="text-[10px] text-gray-500 font-bold">x</span>
        </div>
      </div>
    </div>
  );
};

export default AviatorGame;
