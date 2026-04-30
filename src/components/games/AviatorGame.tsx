"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Menu, MessageCircle, Plane, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  balance: number;
  onUpdateBalance: (b: number) => void;
  onBack: () => void;
}

const historyColor = (m: number) => {
  if (m < 2) return "text-sky-400";
  if (m < 10) return "text-purple-400";
  return "text-pink-400";
};

const fakePlayers = [
  { name: "Ana****", bet: 50, mult: 2.3, win: 115 },
  { name: "Jorg****", bet: 100, mult: 1.5, win: 150 },
  { name: "Mari****", bet: 20, mult: 4.1, win: 82 },
  { name: "Pedr****", bet: 200, mult: 0, win: 0 },
  { name: "Luis****", bet: 10, mult: 3.8, win: 38 },
  { name: "Caro****", bet: 75, mult: 1.2, win: 90 },
];

const AviatorGame = ({ balance, onUpdateBalance, onBack }: Props) => {
  const [phase, setPhase] = useState<"waiting" | "rising" | "crashed">("waiting");
  const [multiplier, setMultiplier] = useState(1.0);
  const [countdown, setCountdown] = useState(5);
  const [history, setHistory] = useState<number[]>([1.82, 3.82, 1.21, 8.45, 1.45, 12.3, 2.1]);
  const [bet1, setBet1] = useState(32);
  const [bet2, setBet2] = useState(80);
  const [hasBet1, setHasBet1] = useState(false);
  const [hasBet2, setHasBet2] = useState(false);
  const [cashed1, setCashed1] = useState(false);
  const [cashed2, setCashed2] = useState(false);
  const [tab, setTab] = useState<"manual" | "auto">("manual");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const crashPointRef = useRef(0);

  const startRound = useCallback(() => {
    setPhase("waiting");
    setMultiplier(1.0);
    setCountdown(5);
    setCashed1(false);
    setCashed2(false);
    crashPointRef.current = 1.05 + Math.random() * Math.random() * 25;
    let c = 5;
    const cd = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(cd);
        setPhase("rising");
      }
    }, 1000);
  }, []);

  useEffect(() => { startRound(); }, [startRound]);

  useEffect(() => {
    if (phase !== "rising") return;
    intervalRef.current = setInterval(() => {
      setMultiplier((p) => {
        const n = p + 0.01 + p * 0.015;
        if (n >= crashPointRef.current) {
          clearInterval(intervalRef.current!);
          setPhase("crashed");
          setHistory((h) => [parseFloat(crashPointRef.current.toFixed(2)), ...h].slice(0, 10));
          return crashPointRef.current;
        }
        return parseFloat(n.toFixed(2));
      });
    }, 80);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase]);

  useEffect(() => {
    if (phase === "crashed") {
      setHasBet1(false);
      setHasBet2(false);
      const t = setTimeout(startRound, 3000);
      return () => clearTimeout(t);
    }
  }, [phase, startRound]);

  const place = (n: 1 | 2) => {
    const amt = n === 1 ? bet1 : bet2;
    if (amt > balance) {
      toast.error("Saldo insuficiente");
      return;
    }
    if (amt <= 0) return;
    if (phase !== "waiting") return;
    onUpdateBalance(balance - amt);
    if (n === 1) setHasBet1(true); else setHasBet2(true);
  };

  const cashOut = (n: 1 | 2) => {
    if (phase !== "rising") return;
    const amt = n === 1 ? bet1 : bet2;
    const has = n === 1 ? hasBet1 : hasBet2;
    const already = n === 1 ? cashed1 : cashed2;
    if (!has || already) return;
    onUpdateBalance(balance + amt * multiplier);
    if (n === 1) setCashed1(true); else setCashed2(true);
  };

  const BetPanel = ({ n }: { n: 1 | 2 }) => {
    const val = n === 1 ? bet1 : bet2;
    const setVal = n === 1 ? setBet1 : setBet2;
    const has = n === 1 ? hasBet1 : hasBet2;
    const cashed = n === 1 ? cashed1 : cashed2;
    return (
      <div className="bg-[#1a1a1a] rounded-xl p-2.5 space-y-2">
        <div className="flex bg-[#0f0f0f] rounded-lg p-0.5">
          <button onClick={() => setTab("manual")} className={`flex-1 py-1 text-[10px] font-bold rounded ${tab === "manual" ? "bg-[#2a2a2a] text-white" : "text-gray-500"}`}>Aposta</button>
          <button onClick={() => setTab("auto")} className={`flex-1 py-1 text-[10px] font-bold rounded ${tab === "auto" ? "bg-[#2a2a2a] text-white" : "text-gray-500"}`}>Auto</button>
        </div>
        <div className="flex items-center bg-[#0f0f0f] rounded-lg">
          <button onClick={() => setVal(Math.max(1, val - 1))} disabled={has} className="px-2 py-2 text-white disabled:opacity-40"><Minus size={14} /></button>
          <input 
            type="number" 
            value={val}
            disabled={has}
            onChange={(e) => setVal(Number(e.target.value))}
            onBlur={(e) => {
              const val = Number(e.target.value);
              if (isNaN(val) || val < 1) setVal(1);
            }}
            inputMode="numeric"
            className="flex-1 bg-transparent text-center text-white font-bold text-sm outline-none w-full"
          />
          <button onClick={() => setVal(val + 1)} disabled={has} className="px-2 py-2 text-white disabled:opacity-40"><Plus size={14} /></button>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {[32, 80, 160, 800].map(v => (
            <button key={v} onClick={() => !has && setVal(prev => prev + v)} disabled={has} className="bg-[#0f0f0f] text-gray-300 text-[10px] font-bold py-1.5 rounded disabled:opacity-40">{v}</button>
          ))}
        </div>
        {phase === "rising" && has && !cashed ? (
          <button onClick={() => cashOut(n)} className="w-full py-3 rounded-lg font-extrabold text-sm bg-[#ffa726] text-black active:scale-[0.96] shadow-[0_0_20px_rgba(255,167,38,0.4)]">
            Retirar<br /><span className="text-xs">{(val * multiplier).toFixed(2)} MZN</span>
          </button>
        ) : (
          <button onClick={() => place(n)} disabled={has || phase !== "waiting"} className={`w-full py-3 rounded-lg font-extrabold text-sm transition-all ${has || phase !== "waiting" ? "bg-gray-700 text-gray-500" : "bg-[#00ff88] text-black active:scale-[0.96] shadow-[0_0_20px_rgba(0,255,136,0.4)]"}`}>
            {has ? (cashed ? "RETIRADO" : "AGUARDE") : "Aposta"}
            {!has && <div className="text-[10px] font-bold mt-0.5">{val.toFixed(2)} MZN</div>}
          </button>
        )}
      </div>
    );
  };

  // Curve path for SVG
  const curvePath = () => {
    const maxM = Math.max(multiplier, 1.5);
    const points: string[] = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const m = 1 + (maxM - 1) * t;
      const x = t * 100;
      const y = 100 - Math.min(((m - 1) / Math.max(maxM - 1, 0.1)) * 90, 90);
      points.push(`${i === 0 ? "M" : "L"}${x},${y}`);
    }
    return points.join(" ");
  };

  const planePos = () => {
    const maxM = Math.max(multiplier, 1.5);
    const x = Math.min(((multiplier - 1) / Math.max(maxM - 1, 0.1)) * 100, 100);
    const y = 100 - Math.min(((multiplier - 1) / Math.max(maxM - 1, 0.1)) * 90, 90);
    return { x, y };
  };

  const pp = planePos();

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col text-white">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-3 py-2.5 bg-black/40 border-b border-white/5">
        <button onClick={onBack}><ArrowLeft size={20} className="text-gray-400" /></button>
        <span className="text-xl font-extrabold italic text-[#ff3b3b]" style={{ fontFamily: "serif" }}>Aviator</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[#00ff88] font-bold text-sm">{balance.toFixed(2)} MZN</span>
          <button className="p-1.5 bg-white/5 rounded-full"><MessageCircle size={16} className="text-gray-400" /></button>
          <button className="p-1.5 bg-white/5 rounded-full"><Menu size={16} className="text-gray-400" /></button>
        </div>
      </div>

      {/* History */}
      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 bg-black/30 scrollbar-hide">
        {history.map((m, i) => (
          <span key={i} className={`text-[11px] font-bold px-2 py-1 rounded-full bg-black/60 whitespace-nowrap ${historyColor(m)}`}>
            {m.toFixed(2)}x
          </span>
        ))}
      </div>

      {/* Game area */}
      <div className="relative flex-1 mx-3 my-3 rounded-2xl overflow-hidden min-h-[260px]" style={{ background: "radial-gradient(ellipse at center, #1a1a1a 0%, #0a0a0a 70%)" }}>
        {/* radial lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
          {[...Array(12)].map((_, i) => (
            <line key={i} x1="50" y1="50" x2={50 + Math.cos(i * Math.PI / 6) * 80} y2={50 + Math.sin(i * Math.PI / 6) * 80} stroke="#ff3b3b" strokeWidth="0.15" />
          ))}
        </svg>

        {phase === "rising" && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d={curvePath()} stroke="#ff3b3b" strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d={`${curvePath()} L100,100 L0,100 Z`} fill="#ff3b3b" opacity="0.15" />
          </svg>
        )}

        {phase === "rising" && (
          <Plane size={28} className="absolute text-[#ff3b3b] drop-shadow-[0_0_10px_rgba(255,59,59,0.8)] transition-all duration-75" style={{ left: `${pp.x}%`, top: `${pp.y}%`, transform: "translate(-50%, -50%) rotate(-25deg)" }} />
        )}

        <div className="absolute inset-0 flex items-center justify-center">
          {phase === "waiting" && (
            <div className="text-center">
              <p className="text-gray-400 text-xs mb-1">PrÃ³xima rodada em</p>
              <p className="text-5xl font-extrabold font-mono">{countdown}</p>
            </div>
          )}
          {phase === "rising" && (
            <p className="text-6xl font-extrabold font-mono text-white drop-shadow-[0_0_20px_rgba(255,59,59,0.5)]">
              {multiplier.toFixed(2)}x
            </p>
          )}
          {phase === "crashed" && (
            <div className="text-center animate-scale-in">
              <p className="text-[#ff3b3b] text-sm font-bold">VOOU!</p>
              <p className="text-5xl font-extrabold font-mono text-[#ff3b3b]">{multiplier.toFixed(2)}x</p>
            </div>
          )}
        </div>
      </div>

      {/* Bet panels */}
      <div className="grid grid-cols-2 gap-2 px-3 pb-2">
        <BetPanel n={1} />
        <BetPanel n={2} />
      </div>

      {/* Players list */}
      <div className="px-3 pb-4">
        <div className="bg-[#1a1a1a] rounded-xl p-2">
          <div className="grid grid-cols-4 gap-2 text-[9px] text-gray-500 font-bold px-2 pb-1 border-b border-white/5">
            <span>Jogador</span><span className="text-right">Aposta</span><span className="text-right">Mult.</span><span className="text-right">Ganho</span>
          </div>
          <div className="max-h-28 overflow-y-auto">
            {fakePlayers.map((p, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 text-[10px] px-2 py-1">
                <span className="text-gray-300">{p.name}</span>
                <span className="text-right text-gray-400">{p.bet}</span>
                <span className={`text-right font-bold ${p.mult === 0 ? "text-gray-600" : historyColor(p.mult)}`}>{p.mult > 0 ? `${p.mult}x` : "-"}</span>
                <span className={`text-right font-bold ${p.win > 0 ? "text-[#00ff88]" : "text-gray-600"}`}>{p.win > 0 ? p.win : "-"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AviatorGame;

