import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Volume2, Menu, Maximize2, Plane, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useGameEngine } from "@/hooks/useGameEngine";
import { playSound } from "@/lib/sounds";
import { playSound } from "@/lib/sounds";

interface Props {
  balance: number;
  onUpdateBalance: (b: number) => void;
  onBack: () => void;
}

const PurpleCrashGame = ({ balance, onUpdateBalance, onBack }: Props) => {
  
  
  
  const [bet1, setBet1] = useState(5);
  const [bet2, setBet2] = useState(5);
  const [auto1, setAuto1] = useState(false);
  const [auto2, setAuto2] = useState(false);
  const [hasBet1, setHasBet1] = useState(false);
  const [hasBet2, setHasBet2] = useState(false);
  const [cashed1, setCashed1] = useState(false);
  const [cashed2, setCashed2] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [statsTab, setStatsTab] = useState("apostas");
  const [lang, setLang] = useState("PT");
  
  
  const { phase, multiplier, countdown, roundId: currentRoundIdRef, startedAt, multiplierRef } = useGameEngine("crash");
  const currentRoundId = { current: currentRoundIdRef };

  

  

  


  const place = async (n: 1 | 2) => {
    const amt = n === 1 ? bet1 : bet2;
    if (amt > balance) {
      toast.error("Saldo insuficiente");
      return;
    }
    if (amt <= 0 || phase !== "waiting") return;

    try {
      const res = await fetch("/api/game/crash/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betAmount: amt, gameId: "crash" })
      });
      const data = await res.json();
      if (data.success) {
        if (n === 1) setHasBet1(true); else setHasBet2(true);
        onUpdateBalance(data.newBalance);
        toast.success("Aposta aceite!");
      } else {
        toast.error(data.error || "Erro ao apostar");
      }
    } catch (e) {
      toast.error("Erro de conexão");
    }
  };

  const cashOut = async (n: 1 | 2, currentMult: number = multiplier) => {
    if (phase !== "rising") return;
    const amt = n === 1 ? bet1 : bet2;
    const has = n === 1 ? hasBet1 : hasBet2;
    const already = n === 1 ? cashed1 : cashed2;
    if (!has || already) return;
    
    if (n === 1) setCashed1(true); else setCashed2(true);

    try {
      const res = await fetch("/api/game/crash/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betAmount: amt, multiplier: currentMult, gameId: "crash" })
      });
      const data = await res.json();
      if (data.success) {
        onUpdateBalance(data.newBalance);
        playSound('cashout');
        toast.success(`Ganhou ${(amt * currentMult).toFixed(2)} MZN!`);
      } else {
        toast.error(data.error || "Erro no cashout");
        if (n === 1) setCashed1(false); else setCashed2(false);
      }
    } catch (e) {
      toast.error("Erro na retirada.");
      if (n === 1) setCashed1(false); else setCashed2(false);
    }
  };

  const curvePath = () => {
    const maxM = Math.max(multiplier, 1.5);
    const points: string[] = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      const m = 1 + (maxM - 1) * t;
      const x = t * 100;
      const y = 95 - Math.min(((m - 1) / Math.max(maxM - 1, 0.1)) * 85, 85);
      points.push(`${i === 0 ? "M" : "L"}${x},${y}`);
    }
    return points.join(" ");
  };

  const planePos = () => {
    const maxM = Math.max(multiplier, 1.5);
    const x = Math.min(((multiplier - 1) / Math.max(maxM - 1, 0.1)) * 100, 95);
    const y = 95 - Math.min(((multiplier - 1) / Math.max(maxM - 1, 0.1)) * 85, 85);
    return { x, y };
  };
  const pp = planePos();

  const renderBetPanel = (n: 1 | 2) => {
    const val = n === 1 ? bet1 : bet2;
    const setVal = n === 1 ? setBet1 : setBet2;
    const auto = n === 1 ? auto1 : auto2;
    const setAuto = n === 1 ? setAuto1 : setAuto2;
    const has = n === 1 ? hasBet1 : hasBet2;
    const cashed = n === 1 ? cashed1 : cashed2;
    return (
      <div className="bg-[#0f3d3e] rounded-xl p-2.5 space-y-2">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-bold text-white/80">Cashout Auto x2</span>
          <button onClick={() => setAuto(!auto)} className={`px-2 py-0.5 rounded text-[9px] font-bold ${auto ? "bg-[#00a86b] text-white" : "bg-white/10 text-white/60"}`}>
            {auto ? "LIGAR" : "DESLIGAR"}
          </button>
        </div>
        <div className="flex items-center justify-between text-[10px] text-white/70">
          <span>AUTO</span>
          <div onClick={() => setAuto(!auto)} className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${auto ? "bg-[#00a86b]" : "bg-white/20"}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${auto ? "left-[18px]" : "left-0.5"}`} />
          </div>
        </div>
        <div className="flex items-center bg-[#063030] rounded-lg">
           <button onClick={() => setVal(Math.max(1, val - 1))} disabled={has} className="px-2 py-2 text-white disabled:opacity-40"><Minus size={14} /></button>
          <input 
            type="number" 
            value={val}
            disabled={has}
            onChange={(e) => setVal(Number(e.target.value))}
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (isNaN(v) || v < 1) setVal(1);
            }}
            inputMode="numeric"
            className="flex-1 bg-transparent text-center text-white font-bold text-sm outline-none w-full"
          />
          <button onClick={() => setVal(val + 1)} disabled={has} className="px-2 py-2 text-white disabled:opacity-40"><Plus size={14} /></button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {[10, 50, 100].map(v => (
            <button key={v} onClick={() => !has && setVal(prev => prev + v)} disabled={has} className="bg-[#063030] text-white/80 text-[10px] font-bold py-1 rounded disabled:opacity-40">{v}</button>
          ))}
        </div>
        {phase === "rising" && has && !cashed ? (
          <button onClick={() => cashOut(n)} className="w-full py-2.5 rounded-lg font-extrabold text-xs bg-orange-500 text-white active:scale-[0.96]">
            RETIRAR {(val * multiplier).toFixed(2)}
          </button>
        ) : (
          <button onClick={() => place(n)} disabled={has || phase !== "waiting"} className={`w-full py-2.5 rounded-lg font-extrabold text-xs ${has || phase !== "waiting" ? "bg-white/10 text-white/40" : "bg-[#00a86b] text-white active:scale-[0.96] shadow-md"}`}>
            JOGAR
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col text-white relative" style={{ background: "linear-gradient(135deg, #2b0d3a 0%, #1a0825 100%)" }}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button onClick={onBack}><ArrowLeft size={20} /></button>
        <span className="text-sm font-bold">âœˆï¸ Crash</span>
        <div className="ml-auto flex items-center gap-2">
          
          <button className="p-1.5 bg-[#0f3d3e] rounded-full"><Maximize2 size={13} /></button>
          <button className="p-1.5 bg-[#0f3d3e] rounded-full"><Volume2 size={13} /></button>
          <button onClick={() => setMenuOpen(true)} className="p-1.5 bg-[#0f3d3e] rounded-full"><Menu size={13} /></button>
        </div>
      </div>

      {/* Game area */}
      <div className="relative mx-3 rounded-2xl overflow-hidden h-60" style={{ background: "radial-gradient(ellipse at bottom left, #4a1d5e 0%, #1a0825 75%)" }}>
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
          {[...Array(10)].map((_, i) => (
            <line key={i} x1="0" y1="100" x2={100} y2={100 - i * 10} stroke="#fff" strokeWidth="0.1" />
          ))}
        </svg>

        {phase === "rising" && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d={`${curvePath()} L100,100 L0,100 Z`} fill="#ff3b3b" opacity="0.15" />
            <path d={curvePath()} stroke="#ff3b3b" strokeWidth="1" fill="none" />
          </svg>
        )}

        {phase === "rising" && (
          <Plane size={28} className="absolute text-[#ff3b3b] drop-shadow-[0_0_12px_rgba(255,59,59,0.8)] transition-all duration-75" style={{ left: `${pp.x}%`, top: `${pp.y}%`, transform: "translate(-50%, -50%) rotate(-30deg)" }} />
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-white/70 text-xs font-bold mb-1">Pontuação actual</p>
          {phase === "waiting" ? (
            <p className="text-5xl font-extrabold font-mono">{countdown}s</p>
          ) : (
            <p className={`text-5xl font-extrabold font-mono ${phase === "crashed" ? "text-red-400" : "text-white"} drop-shadow-lg`}>{multiplier.toFixed(2).replace(\'.\', \',\')}x</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-3 mt-3">
        {renderBetPanel(1)}
        {renderBetPanel(2)}
      </div>

      <div className="px-3 pb-4 mt-3">
        <p className="text-xs font-bold text-white/70 mb-2">Estatísticas de jogo</p>
        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
          {["apostas", "multiplicador", "grandes vitórias", "sua sessão"].map(t => (
            <button key={t} onClick={() => setStatsTab(t)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap capitalize ${statsTab === t ? "bg-[#00a86b] text-white" : "bg-[#0f3d3e] text-white/70"}`}>{t}</button>
          ))}
        </div>
        <div className="bg-[#0f3d3e] rounded-lg p-3 text-[10px] text-white/60 text-center">
          Sem dados em &quot;{statsTab}&quot;
        </div>
      </div>

      {/* Floating menu */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end" onClick={() => setMenuOpen(false)}>
          <div className="w-64 bg-[#0f3d3e] h-full p-4 space-y-3 animate-slide-in-right" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="font-bold">Menu</span>
              <button onClick={() => setMenuOpen(false)}><X size={18} /></button>
            </div>
            {["Tutoriais", "Instruções", "Histórico de apostas", "Estatísticas da sessão"].map(m => (
              <button key={m} className="w-full text-left px-3 py-2 rounded-lg bg-[#063030] text-sm">{m}</button>
            ))}
            <div className="pt-2">
              <p className="text-[11px] text-white/60 mb-1">Idioma</p>
              <select value={lang} onChange={e => setLang(e.target.value)} className="w-full bg-[#063030] text-sm rounded-lg px-3 py-2 outline-none">
                <option value="PT">Português</option>
                <option value="EN">English</option>
                <option value="ES">Español</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurpleCrashGame;

