"use client";

import { useState, useCallback } from "react";
import { ArrowLeft, Maximize2, Menu, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { playSound } from "@/lib/sounds";

interface Props {
  balance: number;
  onUpdateBalance: (b: number) => void;
  onBack: () => void;
}

const MULTIPLIERS_16 = [333, 100, 50, 15, 7, 2, 1, 0.5, 0.1, 0.5, 1, 2, 7, 15, 50, 100, 333];
const MULTIPLIERS_14 = [100, 50, 15, 7, 2, 1, 0.5, 0.1, 0.5, 1, 2, 7, 15, 50, 100];
const MULTIPLIERS_12 = [50, 15, 7, 2, 1, 0.5, 0.1, 0.5, 1, 2, 7, 15, 50];

const slotColor = (m: number) => {
  if (m >= 15) return "bg-gradient-to-b from-pink-500 to-red-600 text-white";
  if (m >= 2) return "bg-gradient-to-b from-orange-400 to-orange-500 text-white";
  return "bg-gradient-to-b from-green-500 to-green-600 text-white";
};

const PlinkoGame = ({ balance, onUpdateBalance, onBack }: Props) => {
  const { isLoggedIn, updateBalance } = useAppStore();
  const [bet, setBet] = useState(10);
  const [pins, setPins] = useState<12 | 14 | 16>(16);
  const [risk, setRisk] = useState<"green" | "yellow" | "red">("red");
  const [dropping, setDropping] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [animStep, setAnimStep] = useState(-1);
  const [path, setPath] = useState<number[]>([]);
  const [finalSlot, setFinalSlot] = useState<number | null>(null);
  const [autoMode, setAutoMode] = useState(false);
  const [history, setHistory] = useState<number[]>([]);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/game/history?game=plinko&limit=12");
      const data = await res.json();
      if (data.history) {
        setHistory(data.history.map((h: any) => h.crashPoint));
      }
    } catch (e) {}
  };

  const saveResult = async (result: number) => {
    try {
      await fetch("/api/game/history/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: "plinko", result: `${result.toFixed(1)}x` })
      });
    } catch (e) {}
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const MULTIPLIERS = pins === 16 ? MULTIPLIERS_16 : pins === 14 ? MULTIPLIERS_14 : MULTIPLIERS_12;

  const drop = useCallback(async () => {
    if (!isLoggedIn) {
      toast.error("Faça login para jogar a dinheiro real!");
      return;
    }

    if (bet > balance) {
      playSound('notification');
      toast.error("Saldo insuficiente");
      return;
    }
    
    if (dropping || bet <= 0) return;
    
    setDropping(true);
    setFinalSlot(null);
    setAnimStep(-1);

    try {
      // O saldo é descontado no backend. Nós apenas pedimos a animação e o resultado.
      const res = await fetch("/api/game/plinko/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betAmount: bet, pins, risk })
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      // Atualizar o saldo subtraindo a aposta no front-end para resposta imediata
      updateBalance(balance - bet);

      const serverPath = data.path;
      const fs = data.finalSlot;
      const win = data.winnings;
      const newBalance = data.newBalance;

      setPath(serverPath);
      let step = 0;
      
      const iv = setInterval(() => {
        setAnimStep(step);
        playSound('notification');
        step++;
        if (step >= pins) {
          clearInterval(iv);
          setLastWin(win);
          setFinalSlot(fs);
          setDropping(false);
          saveResult(MULTIPLIERS[fs]); // Salva o resultado no banco
          setHistory(prev => [MULTIPLIERS[fs], ...prev.slice(0, 11)]);
          playSound('win');
          updateBalance(newBalance); // Saldo final após o ganho
        }
      }, 180);

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao iniciar o jogo");
      setDropping(false);
    }
  }, [dropping, bet, balance, updateBalance, pins, risk, isLoggedIn]);

  return (
    <div className="min-h-screen flex flex-col text-white" style={{ background: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)" }}>
      <div className="flex items-center gap-3 px-3 py-3">
        <button onClick={onBack} className="p-2 bg-white/10 rounded-full"><ArrowLeft size={18} /></button>
        <h1 className="flex-1 text-center text-3xl font-black italic tracking-wider" style={{ textShadow: "3px 3px 0 #d946ef, 6px 6px 0 rgba(0,0,0,0.3)" }}>
          PLINKO 777
        </h1>
        <button className="p-2 bg-white/10 rounded-full"><Maximize2 size={18} /></button>
      </div>

      {/* Funnel */}
      <div className="flex justify-center mt-2 relative z-20">
        <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-t-[25px] border-l-transparent border-r-transparent border-t-white/40" />
      </div>

      {/* History Caps (Ponto 5) */}
      <div className="flex gap-1.5 px-4 overflow-x-auto no-scrollbar relative z-10 py-2">
        {history.map((val, i) => (
          <div key={i} className={`min-w-[40px] h-6 flex items-center justify-center rounded-md text-[9px] font-black border backdrop-blur-md ${val >= 2 ? 'bg-orange-500/20 border-orange-500/30 text-orange-400' : 'bg-green-500/20 border-green-500/30 text-green-400'}`}>
            {val.toFixed(1)}x
          </div>
        ))}
      </div>

      {/* Board */}
      <div className="px-4 mt-2">
        <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-3 relative">
          {Array.from({ length: pins }, (_, row) => {
            const pegsInRow = row + 3;
            return (
              <div key={row} className="flex justify-center gap-2 mb-1.5 relative">
                {Array.from({ length: pegsInRow }, (_, col) => (
                  <div key={col} className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
                ))}
                {animStep === row && path[row] !== undefined && (
                  <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#ff4081] shadow-[0_0_12px_rgba(255,64,129,0.9)] transition-all duration-150"
                    style={{ left: `${(path[row] / (MULTIPLIERS.length - 1)) * 100}%`, transform: "translate(-50%, -50%)" }} />
                )}
              </div>
            );
          })}
          <div className="flex gap-0.5 mt-2">
            {MULTIPLIERS.map((m, i) => (
              <div key={i} className={`flex-1 py-1.5 rounded text-center text-[8px] font-extrabold transition-all ${slotColor(m)} ${finalSlot === i ? "ring-2 ring-white scale-110" : ""}`}>
                {m}x
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-black/30 rounded-xl p-2 border-2 border-[#00ff88]/60 shadow-[0_0_15px_rgba(0,255,136,0.3)]">
            <p className="text-[9px] text-white/60">Último ganho</p>
            <p className="text-lg font-extrabold text-[#00ff88]">{lastWin.toFixed(2)} MT</p>
          </div>
          <div className="bg-purple-900/60 rounded-xl p-2">
            <p className="text-[9px] text-white/60">Saldo</p>
            
          </div>
        </div>

        <button onClick={() => setAutoMode(!autoMode)} className="w-full py-2.5 rounded-xl font-extrabold text-sm text-white active:scale-[0.96]" style={{ background: "linear-gradient(90deg, #6a11cb 0%, #f59e0b 50%, #ec4899 100%)" }}>
          {autoMode ? "âœ“ MODO AUTO ATIVO" : "MODO AUTO"}
        </button>

        <div>
          <p className="text-[10px] text-white/70 mb-1.5">Risco / Chance</p>
          <div className="flex gap-2 justify-center">
            {(["green", "yellow", "red"] as const).map(r => {
              const color = r === "green" ? "bg-green-500" : r === "yellow" ? "bg-yellow-500" : "bg-red-500";
              return (
                <button key={r} onClick={() => !dropping && setRisk(r)} className={`w-10 h-10 rounded-full ${color} ${risk === r ? "ring-4 ring-white" : "opacity-60"} shadow-lg`} />
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[10px] text-white/70 mb-1.5">Número de pinos</p>
          <div className="grid grid-cols-3 gap-2">
            {([12, 14, 16] as const).map(p => (
              <button key={p} onClick={() => !dropping && setPins(p)} className={`py-2 rounded-xl font-bold text-xs ${pins === p ? "bg-white text-purple-900" : "bg-black/30 text-white/80"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-1">
          {[1, 5, 10, 50].map(v => (
            <button 
              key={v} 
              onClick={() => !dropping && setBet(prev => prev + v)} 
              disabled={dropping}
              className="bg-black/30 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-bold text-white/70 hover:text-white transition-colors disabled:opacity-40"
            >
              +{v}
            </button>
          ))}
        </div>

        <div className="flex items-center bg-black/30 rounded-xl">
          <button onClick={() => setBet(Math.max(1, bet - 1))} disabled={dropping} className="px-3 py-3 disabled:opacity-40"><Minus size={16} /></button>
          <input 
            type="number" 
            value={bet} 
            disabled={dropping}
            onChange={(e) => setBet(Number(e.target.value))}
            onBlur={(e) => {
              const val = Number(e.target.value);
              if (isNaN(val) || val < 1) setBet(1);
            }}
            inputMode="numeric"
            className="flex-1 bg-transparent text-center font-extrabold text-lg outline-none w-full"
          />
          <button onClick={() => setBet(bet + 1)} disabled={dropping} className="px-3 py-3 disabled:opacity-40"><Plus size={16} /></button>
        </div>

        <button onClick={drop} disabled={dropping} className={`w-full py-3.5 rounded-xl font-extrabold text-sm ${dropping ? "bg-white/10 text-white/40" : "bg-gradient-to-r from-pink-500 to-purple-600 text-white active:scale-[0.96] shadow-[0_0_20px_rgba(236,72,153,0.5)]"}`}>
          {dropping ? "A CAIR..." : `LANÇAR BOLA — ${bet} MT`}
        </button>
      </div>
    </div>
  );
};

export default PlinkoGame;
