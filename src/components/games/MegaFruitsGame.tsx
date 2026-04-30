"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Maximize2, RotateCw, Trash2, Play, Volume2, Trophy, Coins } from "lucide-react";
import { toast } from "sonner";
import { startBgMusic } from "@/lib/sounds";

interface MegaFruitsProps {
  balance: number;
  onUpdateBalance: (b: number) => void;
  onBack: () => void;
}

const SYMBOLS = [
  { icon: "ðŸ’", name: "Cereja", mult: 2 },
  { icon: "ðŸŒ", name: "Banana", mult: 3 },
  { icon: "ðŸŠ", name: "Laranja", mult: 5 },
  { icon: "ðŸ‰", name: "Melancia", mult: 10 },
  { icon: "ðŸ“", name: "Morango", mult: 20 },
  { icon: "ðŸ‡", name: "Uva", mult: 50 },
  { icon: "💎", name: "777", mult: 100 },
];

const REELS_COUNT = 3;
const ROWS_COUNT = 3;

const MegaFruitsGame = ({ balance, onUpdateBalance, onBack }: MegaFruitsProps) => {
  const [betAmount, setBetAmount] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const [reels, setReels] = useState<string[][]>(
    Array(REELS_COUNT).fill(null).map(() => 
      Array(ROWS_COUNT).fill(null).map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].icon)
    )
  );
  const [winningLine, setWinningLine] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState(0);
  const autoIntervalRef = useRef<any>(null);

  const handleSpin = useCallback(() => {
    if (balance < betAmount) {
      toast.error("Saldo insuficiente");
      setIsAuto(false);
      return;
    }

    if (isSpinning) return;

    setIsSpinning(true);
    setWinningLine(null);
    onUpdateBalance(balance - betAmount);
    startBgMusic();

    // Simulated spinning animation
    const spinDuration = 1000;
    const startTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      
      if (elapsed < spinDuration) {
        setReels(prev => prev.map(reel => 
          reel.map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].icon)
        ));
        requestAnimationFrame(animate);
      } else {
        // Final result
        const finalReels = Array(REELS_COUNT).fill(null).map(() => 
          Array(ROWS_COUNT).fill(null).map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].icon)
        );
        setReels(finalReels);
        setIsSpinning(false);
        checkWin(finalReels);
      }
    };

    requestAnimationFrame(animate);
  }, [balance, betAmount, isSpinning, onUpdateBalance]);

  const checkWin = (currentReels: string[][]) => {
    // Check horizontal lines
    let totalWin = 0;
    let wonLine = null;

    for (let row = 0; row < ROWS_COUNT; row++) {
      const firstIcon = currentReels[0][row];
      if (currentReels[1][row] === firstIcon && currentReels[2][row] === firstIcon) {
        const symbol = SYMBOLS.find(s => s.icon === firstIcon);
        if (symbol) {
          totalWin += betAmount * symbol.mult;
          wonLine = row;
        }
      }
    }

    if (totalWin > 0) {
      setLastWin(totalWin);
      setWinningLine(wonLine);
      onUpdateBalance(balance - betAmount + totalWin);
      toast.success(`PARABÉNS! Você ganhou ${totalWin.toFixed(2)} MT!`, {
        icon: "🎰",
        className: "bg-yellow-500 text-black font-bold"
      });
    }
  };

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
    <div className="fixed inset-0 z-[110] bg-[#1a0505] flex flex-col font-sans text-white overflow-hidden animate-in fade-in duration-300">
      {/* Lights background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,165,0,0.1)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffd700 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/60 backdrop-blur-md border-b border-yellow-500/30 relative z-10 shadow-[0_4px_20px_rgba(255,165,0,0.2)]">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-yellow-500" />
          </button>
          <div className="flex flex-col">
            <span className="font-black italic tracking-tighter text-2xl bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent drop-shadow-sm">MEGA FRUITS</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-black/40 px-4 py-2 rounded-full border border-yellow-500/50 flex items-center gap-2">
            <Coins className="text-yellow-400" size={16} />
            <span className="text-sm font-black text-yellow-400">{balance.toFixed(2)} MT</span>
          </div>
        </div>
      </div>

      {/* Slot Machine Container */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {/* Machine Frame */}
        <div className="w-full max-w-sm relative bg-gradient-to-b from-red-800 to-red-950 p-6 rounded-[3rem] border-[6px] border-yellow-600 shadow-[0_0_50px_rgba(255,0,0,0.3),inset_0_0_20px_rgba(0,0,0,0.5)]">
          {/* Animated Lights around frame */}
          <div className="absolute -inset-2 border-4 border-dashed border-yellow-400/30 rounded-[3.5rem] animate-[spin_10s_linear_infinite]" />
          
          {/* Jackpot Display */}
          <div className="mb-6 bg-black/80 rounded-2xl border-2 border-yellow-500/40 py-2 px-4 text-center">
             <div className="text-[10px] font-black text-yellow-500/60 uppercase tracking-widest">Último Ganho</div>
             <div className="text-3xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.5)] italic">
               {lastWin.toFixed(2)} MT
             </div>
          </div>

          {/* Reels Area */}
          <div className="bg-white/90 rounded-2xl p-2 grid grid-cols-3 gap-2 shadow-inner overflow-hidden relative border-4 border-black/20">
            {reels.map((reel, reelIdx) => (
              <div key={reelIdx} className="flex flex-col gap-2 relative">
                {reel.map((icon, rowIdx) => (
                  <div 
                    key={rowIdx} 
                    className={`h-24 flex items-center justify-center text-5xl bg-gradient-to-b from-gray-50 to-gray-200 rounded-xl shadow-md transition-all duration-100 ${winningLine === rowIdx ? 'animate-bounce ring-4 ring-yellow-400 z-10' : ''}`}
                  >
                    <span className={isSpinning ? 'blur-[2px]' : ''}>{icon}</span>
                  </div>
                ))}
                <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-black/10 to-transparent" />
              </div>
            ))}
            
            {/* Win Lines markers */}
            <div className="absolute inset-y-0 left-0 w-full pointer-events-none flex flex-col justify-around py-4">
               {[0, 1, 2].map(i => (
                 <div key={i} className={`h-0.5 w-full bg-yellow-400/20 ${winningLine === i ? 'bg-yellow-400 opacity-100 shadow-[0_0_10px_white]' : 'opacity-0'}`} />
               ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 flex gap-4 overflow-x-auto w-full no-scrollbar px-4 pb-2">
           {SYMBOLS.map(s => (
             <div key={s.name} className="flex flex-col items-center bg-black/40 rounded-xl p-2 border border-white/5 min-w-[60px]">
                <span className="text-2xl">{s.icon}</span>
                <span className="text-[10px] font-black text-yellow-500">x{s.mult}</span>
             </div>
           ))}
        </div>
      </div>

      {/* Betting Panel */}
      <div className="bg-gradient-to-t from-black to-[#2a0808] p-5 pb-10 rounded-t-[3rem] border-t-4 border-yellow-600 relative z-30 shadow-[0_-20px_60px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col gap-5 max-w-sm mx-auto">
           {/* Quick buttons */}
           <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {[10, 20, 50, 100].map(v => (
                <button 
                  key={v} 
                  onClick={() => !isSpinning && setBetAmount(v)} 
                  disabled={isSpinning}
                  className="bg-red-900/40 border border-yellow-500/20 px-4 py-2 rounded-xl text-xs font-black text-yellow-500/80 hover:text-yellow-400 transition-colors disabled:opacity-40"
                >
                  {v}
                </button>
              ))}
              <button 
                onClick={() => setBetAmount(10)} 
                className="bg-black/40 border border-white/10 px-4 py-2 rounded-xl text-xs font-black text-white/50"
              >
                C
              </button>
           </div>
           
           <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                 <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Valor da Aposta</span>
                 <div className="bg-black/60 rounded-xl p-1 flex items-center border border-yellow-500/30 h-14">
                    <button 
                      onClick={() => !isSpinning && setBetAmount(Math.max(1, betAmount - 10))} 
                      className="w-12 h-full flex items-center justify-center text-yellow-500 text-xl font-bold"
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      value={betAmount}
                      disabled={isSpinning}
                      onChange={(e) => setBetAmount(Number(e.target.value))}
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (isNaN(val) || val < 1) setBetAmount(1);
                      }}
                      className="flex-1 bg-transparent text-center font-black text-lg italic outline-none w-full text-white"
                    />
                    <button 
                      onClick={() => !isSpinning && setBetAmount(betAmount + 10)} 
                      className="w-12 h-full flex items-center justify-center text-yellow-500 text-xl font-bold"
                    >
                      +
                    </button>
                 </div>
              </div>
              <div className="flex flex-col gap-1.5">
                 <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Modo</span>
                 <button 
                    onClick={() => setIsAuto(!isAuto)}
                    disabled={isSpinning}
                    className={`h-14 rounded-xl flex items-center justify-center gap-2 border transition-all ${isAuto ? 'bg-yellow-500 border-yellow-400 text-black font-black' : 'bg-black/60 border-white/10 text-gray-400 font-bold'}`}
                 >
                    <RotateCw size={18} className={isAuto ? 'animate-spin' : ''} />
                    {isAuto ? 'AUTO: ON' : 'AUTO: OFF'}
                 </button>
              </div>
           </div>

           <button 
             onClick={handleSpin}
             disabled={isSpinning}
             className={`w-full py-5 rounded-2xl font-black text-2xl tracking-[0.2em] transition-all transform active:scale-95 shadow-[0_10px_30px_rgba(239,68,68,0.4)]
               ${isSpinning ? 'bg-gray-800 text-gray-500 cursor-not-allowed grayscale' : 'bg-gradient-to-r from-red-600 via-orange-500 to-red-600 bg-[length:200%_auto] animate-[gradient_3s_linear_infinite] text-white'}
             `}
           >
             {isSpinning ? 'GIRANDO...' : 'SPIN'}
           </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default MegaFruitsGame;
