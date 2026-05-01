"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Maximize2, RotateCw, Trophy, Coins, Zap, ShieldCheck, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { startBgMusic } from "@/lib/sounds";

interface LionZamaProps {
  balance: number;
  onUpdateBalance: (b: number) => void;
  onBack: () => void;
}

const SYMBOLS = [
  { icon: "🍇", name: "Uva", mult: 5, color: "text-purple-400" },
  { icon: "🍎", name: "Maçã", mult: 8, color: "text-red-400" },
  { icon: "🍌", name: "Banana", mult: 12, color: "text-yellow-400" },
  { icon: "🍉", name: "Melancia", mult: 20, color: "text-green-400" },
  { icon: "🔔", name: "Sino", mult: 30, color: "text-yellow-500" },
  { icon: "⭐", name: "Estrela", mult: 40, color: "text-blue-400" },
  { icon: "77", name: "77", mult: 60, color: "text-red-600" },
  { icon: "BAR", name: "BAR", mult: 100, color: "text-white" },
  { icon: "🦁", name: "Leão", mult: 500, color: "text-amber-500" },
];

const REELS_COUNT = 3;
const ROWS_COUNT = 3;

const LionZamaGame = ({ balance, onUpdateBalance, onBack }: LionZamaProps) => {
  const [betAmount, setBetAmount] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const [risk, setRisk] = useState<"low" | "high">("low");
  const [reels, setReels] = useState<any[][]>(
    Array(REELS_COUNT).fill(null).map(() => 
      Array(ROWS_COUNT).fill(null).map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
    )
  );
  const [winningLine, setWinningLine] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState(0);
  const autoIntervalRef = useRef<any>(null);

  const handleSpin = useCallback(async () => {
    if (balance < betAmount) {
      toast.error("Saldo insuficiente");
      setIsAuto(false);
      return;
    }

    if (isSpinning) return;

    setIsSpinning(true);
    setWinningLine(null);
    startBgMusic([392, 440, 493, 587, 493, 440], 200, 0.05);

    try {
      const res = await fetch("/api/game/slot/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betAmount, gameId: "lion-zama" })
      });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.error);
        setIsSpinning(false);
        setIsAuto(false);
        return;
      }

      onUpdateBalance(data.newBalance - (data.wins ? data.winAmount : 0)); // temp balance drop

      const spinDuration = 1200;
      const startTime = Date.now();
      
      const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        
        if (elapsed < spinDuration) {
          setReels(prev => prev.map(reel => 
            reel.map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
          ));
          requestAnimationFrame(animate);
        } else {
          // Determine final reels based on backend result
          let finalReels = Array(REELS_COUNT).fill(null).map(() => 
            Array(ROWS_COUNT).fill(null).map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
          );

          if (data.wins) {
            // Force a win on row 1
            const winSymbol = SYMBOLS[Math.floor(Math.random() * 3)]; // Pick a low tier visual symbol
            finalReels[0][1] = winSymbol;
            finalReels[1][1] = winSymbol;
            finalReels[2][1] = winSymbol;
            setWinningLine(1);
            setLastWin(data.winAmount);
            onUpdateBalance(data.newBalance);
            toast.success(`LION WIN! +${data.winAmount.toFixed(2)} MT`, {
              className: "bg-purple-600 text-white font-black border-2 border-fuchsia-400 shadow-[0_0_20px_rgba(168,85,247,0.5)]"
            });
          } else {
            // Ensure no accidental win
            if (finalReels[0][0].icon === finalReels[1][0].icon && finalReels[1][0].icon === finalReels[2][0].icon) {
                finalReels[2][0] = SYMBOLS[(SYMBOLS.indexOf(finalReels[2][0]) + 1) % SYMBOLS.length];
            }
            if (finalReels[0][1].icon === finalReels[1][1].icon && finalReels[1][1].icon === finalReels[2][1].icon) {
                finalReels[2][1] = SYMBOLS[(SYMBOLS.indexOf(finalReels[2][1]) + 1) % SYMBOLS.length];
            }
            if (finalReels[0][2].icon === finalReels[1][2].icon && finalReels[1][2].icon === finalReels[2][2].icon) {
                finalReels[2][2] = SYMBOLS[(SYMBOLS.indexOf(finalReels[2][2]) + 1) % SYMBOLS.length];
            }
            onUpdateBalance(data.newBalance);
          }

          setReels(finalReels);
          setIsSpinning(false);
        }
      };

      requestAnimationFrame(animate);

    } catch (e) {
      toast.error("Erro ao jogar.");
      setIsSpinning(false);
      setIsAuto(false);
    }
  }, [balance, betAmount, isSpinning, onUpdateBalance]);

  useEffect(() => {
    if (isAuto && !isSpinning) {
      autoIntervalRef.current = setTimeout(handleSpin, 1500);
    } else if (!isAuto) {
      if (autoIntervalRef.current) clearTimeout(autoIntervalRef.current);
    }
    return () => {
      if (autoIntervalRef.current) clearTimeout(autoIntervalRef.current);
    };
  }, [isAuto, isSpinning, handleSpin]);

  return (
    <div className="fixed inset-0 z-[110] bg-[#05010a] flex flex-col font-sans text-white overflow-hidden animate-in fade-in duration-500">
      {/* Neon Glow Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.15)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(217,70,239,0.05)_100%)] pointer-events-none" />
      
      {/* Payout Bar Top */}
      <div className="h-8 bg-gradient-to-r from-purple-900/80 via-fuchsia-900/80 to-purple-900/80 backdrop-blur-md flex items-center justify-center border-b border-fuchsia-500/30 overflow-hidden">
        <div className="flex gap-8 animate-[scroll_20s_linear_infinite] whitespace-nowrap">
           {SYMBOLS.map(s => (
             <span key={s.name} className="text-[10px] font-black tracking-widest text-fuchsia-300">
                {s.icon} PAYOUT: x{s.mult}
             </span>
           ))}
           {/* Duplicate for seamless loop */}
           {SYMBOLS.map(s => (
             <span key={`${s.name}-dup`} className="text-[10px] font-black tracking-widest text-fuchsia-300">
                {s.icon} PAYOUT: x{s.mult}
             </span>
           ))}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-4 relative z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 bg-white/5 backdrop-blur-lg rounded-xl flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all">
            <ArrowLeft size={20} className="text-fuchsia-400" />
          </button>
          <div className="flex flex-col">
            <span className="font-black italic tracking-tighter text-2xl bg-gradient-to-r from-fuchsia-400 via-purple-500 to-indigo-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">LION ZAMA</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-purple-900/40 backdrop-blur-lg px-4 py-2 rounded-2xl border border-fuchsia-500/30 flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Coins className="text-fuchsia-400" size={16} />
            <span className="text-sm font-black text-white tracking-tight">{balance.toFixed(2)} MT</span>
          </div>
        </div>
      </div>

      {/* Game Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {/* Lion Background Image (placeholder for realism) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg aspect-square opacity-10 pointer-events-none blur-sm">
           <span className="text-[200px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">🦁</span>
        </div>

        {/* Slot Frame Premium */}
        <div className="w-full max-w-sm relative z-20">
           {/* Top Lion Emblem */}
           <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-gradient-to-b from-fuchsia-600 to-purple-900 rounded-full border-4 border-fuchsia-400 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.6)] z-30">
              <span className="text-4xl animate-pulse">🦁</span>
           </div>

           <div className="bg-[#120422] p-4 rounded-[2.5rem] border-[4px] border-fuchsia-500/40 shadow-[0_0_60px_rgba(168,85,247,0.4),inset_0_0_20px_rgba(0,0,0,0.8)] overflow-hidden">
              {/* Internal Frame */}
              <div className="bg-black/80 rounded-[2rem] p-3 relative overflow-hidden">
                 {/* Win effect */}
                 {winningLine !== null && (
                   <div className="absolute inset-0 bg-fuchsia-500/10 animate-pulse z-0" />
                 )}
                 
                 <div className="grid grid-cols-3 gap-2.5 relative z-10">
                    {reels.map((reel, reelIdx) => (
                      <div key={reelIdx} className="flex flex-col gap-2.5">
                        {reel.map((symbol, rowIdx) => (
                          <div 
                            key={rowIdx} 
                            className={`h-28 flex flex-col items-center justify-center bg-gradient-to-b from-white/5 to-white/10 rounded-2xl border border-white/5 transition-all duration-300 transform 
                              ${winningLine === rowIdx ? 'animate-[bounce_0.5s_infinite] border-fuchsia-400 shadow-[0_0_20px_rgba(168,85,247,0.5)] z-20 bg-fuchsia-500/10' : ''}
                              ${isSpinning ? 'blur-[3px]' : ''}
                            `}
                          >
                            <span className={`text-4xl drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] ${symbol.color}`}>
                               {symbol.icon}
                            </span>
                            {!isSpinning && (
                               <span className="text-[8px] font-black opacity-30 tracking-tighter mt-1">{symbol.name}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                 </div>
                 
                 {/* Decorative vertical lines */}
                 <div className="absolute top-0 left-[33.3%] w-px h-full bg-white/5" />
                 <div className="absolute top-0 left-[66.6%] w-px h-full bg-white/5" />
              </div>
           </div>
        </div>

        {/* Win Display */}
        <div className="mt-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 py-3 px-8 text-center shadow-xl">
           <div className="text-[10px] font-black text-fuchsia-400/60 uppercase tracking-[0.3em] mb-1">Última Vitória</div>
           <div className="text-2xl font-black text-white italic tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              {lastWin.toFixed(2)} MT
           </div>
        </div>
      </div>

      {/* Control Panel VIP */}
      <div className="bg-[#0a0212] p-6 pb-12 rounded-t-[3.5rem] border-t-2 border-fuchsia-500/50 relative z-30 shadow-[0_-20px_50px_rgba(0,0,0,0.9)]">
        <div className="max-w-sm mx-auto flex flex-col gap-6">
           
           {/* Risk & Mode Switchers */}
           <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/40 rounded-2xl p-1 flex border border-white/5">
                 <button 
                    onClick={() => setRisk("low")}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${risk === "low" ? 'bg-fuchsia-600 text-white shadow-lg' : 'text-gray-500'}`}
                 >
                    RISCO BAIXO
                 </button>
                 <button 
                    onClick={() => setRisk("high")}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${risk === "high" ? 'bg-fuchsia-600 text-white shadow-lg' : 'text-gray-500'}`}
                 >
                    RISCO ALTO
                 </button>
              </div>
              <button 
                onClick={() => setIsAuto(!isAuto)}
                className={`flex items-center justify-center gap-2 rounded-2xl border transition-all ${isAuto ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-black/40 border-white/5 text-gray-500'}`}
              >
                <RotateCw size={14} className={isAuto ? 'animate-spin' : ''} />
                <span className="text-[10px] font-black">{isAuto ? 'AUTO ON' : 'AUTO OFF'}</span>
              </button>
           </div>

           {/* Betting & Play */}
           <div className="flex flex-col gap-4">
              <div className="flex items-center bg-black/60 rounded-3xl p-1.5 border border-fuchsia-500/20 h-16 shadow-inner">
                 <button 
                    onClick={() => !isSpinning && setBetAmount(Math.max(1, betAmount - 10))}
                    className="w-12 h-full flex items-center justify-center bg-white/5 rounded-2xl text-fuchsia-400 hover:text-white transition-colors"
                 >
                    <Zap size={18} fill="currentColor" />
                 </button>
                 <input 
                    type="number" 
                    value={betAmount}
                    disabled={isSpinning}
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                    className="flex-1 bg-transparent text-center font-black text-xl italic outline-none text-white px-2"
                 />
                 <button 
                    onClick={() => !isSpinning && setBetAmount(betAmount + 10)}
                    className="w-12 h-full flex items-center justify-center bg-white/5 rounded-2xl text-fuchsia-400 hover:text-white transition-colors"
                 >
                    <TrendingUp size={18} />
                 </button>
              </div>

              <button 
                onClick={handleSpin}
                disabled={isSpinning}
                className={`w-full py-5 rounded-[2rem] font-black text-2xl tracking-[0.1em] transition-all transform active:scale-95 shadow-[0_15px_35px_rgba(168,85,247,0.3)]
                  ${isSpinning ? 'bg-gray-800 text-gray-500 grayscale cursor-not-allowed' : 'bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 text-white border-t-2 border-fuchsia-400'}
                `}
              >
                {isSpinning ? 'RODANDO...' : 'JOGAR'}
              </button>
           </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default LionZamaGame;
