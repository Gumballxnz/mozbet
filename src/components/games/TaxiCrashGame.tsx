"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Maximize2, Menu, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  balance: number;
  onUpdateBalance: (b: number) => void;
  onBack: () => void;
}

const TaxiCrashGame = ({ balance, onUpdateBalance, onBack }: Props) => {
  const [phase, setPhase] = useState<"waiting" | "rising" | "crashed">("waiting");
  const [multiplier, setMultiplier] = useState(1.0);
  const [countdown, setCountdown] = useState(4);
  const [bet1, setBet1] = useState(10);
  const [bet2, setBet2] = useState(10);
  const [auto1, setAuto1] = useState(false);
  const [auto2, setAuto2] = useState(false);
  const [hasBet1, setHasBet1] = useState(false);
  const [hasBet2, setHasBet2] = useState(false);
  const [cashed1, setCashed1] = useState(false);
  const [cashed2, setCashed2] = useState(false);
  const [statsTab, setStatsTab] = useState("apostas");
  const crashRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRound = useCallback(() => {
    setPhase("waiting");
    setMultiplier(1.0);
    setCountdown(4);
    setCashed1(false);
    setCashed2(false);
    crashRef.current = 1.1 + Math.random() * Math.random() * 15;
    let c = 4;
    const cd = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) { clearInterval(cd); setPhase("rising"); }
    }, 1000);
  }, []);

  useEffect(() => { startRound(); }, [startRound]);

  useEffect(() => {
    if (phase !== "rising") return;
    intervalRef.current = setInterval(() => {
      setMultiplier((p) => {
        const n = p + 0.01 + p * 0.012;
        if (n >= crashRef.current) {
          clearInterval(intervalRef.current!);
          setPhase("crashed");
          return crashRef.current;
        }
        // auto cashout at 2x
        if (auto1 && hasBet1 && !cashed1 && n >= 2) {
          onUpdateBalance(balance + bet1 * 2);
          setCashed1(true);
        }
        if (auto2 && hasBet2 && !cashed2 && n >= 2) {
          onUpdateBalance(balance + bet2 * 2);
          setCashed2(true);
        }
        return parseFloat(n.toFixed(2));
      });
    }, 80);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase, auto1, auto2, hasBet1, hasBet2, cashed1, cashed2, bet1, bet2, balance, onUpdateBalance]);

  useEffect(() => {
    if (phase === "crashed") {
      setHasBet1(false);
      setHasBet2(false);
      const t = setTimeout(startRound, 2500);
      return () => clearTimeout(t);
    }
  }, [phase, startRound]);

  const place = (n: 1 | 2) => {
    const amt = n === 1 ? bet1 : bet2;
    if (amt > balance) {
      toast.error("Saldo insuficiente");
      return;
    }
    if (amt <= 0 || phase !== "waiting") return;
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

  const carX = phase === "rising" ? Math.min(multiplier * 20, 80) : phase === "crashed" ? 85 : 10;

  const BetPanel = ({ n }: { n: 1 | 2 }) => {
    const val = n === 1 ? bet1 : bet2;
    const setVal = n === 1 ? setBet1 : setBet2;
    const auto = n === 1 ? auto1 : auto2;
    const setAuto = n === 1 ? setAuto1 : setAuto2;
    const has = n === 1 ? hasBet1 : hasBet2;
    const cashed = n === 1 ? cashed1 : cashed2;
    return (
      <div className="bg-[#1e3a5f] rounded-xl p-2.5 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-white/80">
          <span className="font-bold">Escapar Auto x2</span>
          <button onClick={() => setAuto(!auto)} className={`px-2 py-0.5 rounded text-[9px] font-bold ${auto ? "bg-[#ffcc00] text-black" : "bg-white/10 text-white/60"}`}>
            {auto ? "LIGADO" : "DESLIGADO"}
          </button>
        </div>
        <div className="flex items-center justify-between text-[10px] text-white/80">
          <span>AUTO</span>
          <div onClick={() => setAuto(!auto)} className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${auto ? "bg-[#ffcc00]" : "bg-white/20"}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${auto ? "left-[18px]" : "left-0.5"}`} />
          </div>
        </div>
        <div className="flex items-center bg-[#0b1f3a] rounded-lg">
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
        <div className="grid grid-cols-3 gap-1">
          {[10, 50, 100].map(v => (
            <button key={v} onClick={() => !has && setVal(prev => prev + v)} disabled={has} className="bg-[#0b1f3a] text-white/80 text-[10px] font-bold py-1.5 rounded disabled:opacity-40">{v}</button>
          ))}
        </div>
        {phase === "rising" && has && !cashed ? (
          <button onClick={() => cashOut(n)} className="w-full py-3 rounded-lg font-extrabold text-sm bg-[#00cc66] text-white active:scale-[0.96]">
            RETIRAR {(val * multiplier).toFixed(2)}
          </button>
        ) : (
          <button onClick={() => place(n)} disabled={has || phase !== "waiting"} className={`w-full py-3 rounded-lg font-extrabold text-sm ${has || phase !== "waiting" ? "bg-white/10 text-white/40" : "bg-[#ffcc00] text-black active:scale-[0.96]"}`}>
            {has ? (cashed ? "GANHOU" : "NA VIAGEM") : "JOGAR"}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0b1f3a] flex flex-col text-white">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button onClick={onBack}><ArrowLeft size={20} /></button>
        <span className="text-xs font-bold">ðŸš• Taxi Crash</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[#1e3a5f] text-[#ffcc00] font-bold text-xs">{balance.toFixed(2)} MZN</span>
          <button className="p-1.5 bg-[#1e3a5f] rounded-full"><Maximize2 size={14} /></button>
          <button className="p-1.5 bg-[#1e3a5f] rounded-full"><Menu size={14} /></button>
        </div>
      </div>

      {/* Scene */}
      <div className="relative mx-3 rounded-2xl overflow-hidden h-56" style={{ background: "linear-gradient(to bottom, #64b5f6 0%, #90caf9 40%, #ffb74d 70%, #5d4037 100%)" }}>
        {/* Sun */}
        <div className="absolute top-6 right-10 w-12 h-12 rounded-full bg-[#fff59d] shadow-[0_0_40px_rgba(255,235,59,0.6)]" />
        {/* Buildings */}
        <div className="absolute bottom-8 left-0 right-0 flex items-end gap-1 px-2">
          {[40, 60, 35, 70, 45, 55, 30, 65, 50].map((h, i) => (
            <div key={i} className="flex-1 bg-[#1a237e]" style={{ height: `${h}px` }} />
          ))}
        </div>
        {/* Road */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-[#212121]">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 flex gap-2">
            {[...Array(10)].map((_, i) => <div key={i} className="flex-1 bg-[#ffcc00]" />)}
          </div>
        </div>
        {/* Car */}
        <div className="absolute bottom-3 text-3xl transition-all duration-100" style={{ left: `${carX}%` }}>
          {phase === "crashed" ? "ðŸ’¥" : "ðŸš•"}
        </div>

        {/* Multiplier */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-white/90 text-xs font-bold mb-1 drop-shadow">PontuaÃ§Ã£o actual</p>
          {phase === "waiting" ? (
            <p className="text-4xl font-extrabold font-mono drop-shadow-lg">{countdown}s</p>
          ) : (
            <p className={`text-5xl font-extrabold font-mono drop-shadow-lg ${phase === "crashed" ? "text-red-300" : "text-white"}`}>x{multiplier.toFixed(2)}</p>
          )}
        </div>
      </div>

      {/* Bet panels */}
      <div className="grid grid-cols-2 gap-2 px-3 mt-3">
        <BetPanel n={1} />
        <BetPanel n={2} />
      </div>

      {/* Stats */}
      <div className="px-3 pb-4 mt-3">
        <p className="text-xs font-bold text-white/70 mb-2">EstatÃ­sticas de jogo</p>
        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
          {["apostas", "multiplicador", "grandes vitÃ³rias", "sua sessÃ£o"].map(t => (
            <button key={t} onClick={() => setStatsTab(t)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap capitalize ${statsTab === t ? "bg-[#ffcc00] text-black" : "bg-[#1e3a5f] text-white/70"}`}>{t}</button>
          ))}
        </div>
        <div className="bg-[#1e3a5f] rounded-lg p-3 text-[10px] text-white/60 text-center">
          Nenhum dado disponÃ­vel na aba "{statsTab}"
        </div>
      </div>
    </div>
  );
};

export default TaxiCrashGame;

