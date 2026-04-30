"use client";

import { useState, useEffect } from "react";
import { X, Diamond, Info, History, Play, Users, Bomb, Trophy, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { startBgMusic } from "@/lib/sounds";

interface MinesGameProps {
  onClose: () => void;
  balance: number;
  onBet: (amount: number) => void;
}

const MinesGame = ({ onClose, balance, onBet }: MinesGameProps) => {
  const [betAmount, setBetAmount] = useState(10);
  const [mineCount, setMineCount] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [grid, setGrid] = useState<any[]>(Array(25).fill({ status: 'hidden' }));
  const [mines, setMines] = useState<number[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [nextMultiplier, setNextMultiplier] = useState(1.18);

  const calculateMultiplier = (mines: number, revealed: number) => {
    // Simplified multiplier logic
    let mult = 1.0;
    for (let i = 0; i <= revealed; i++) {
       mult *= (25 - i) / (25 - mines - i);
    }
    return Number(mult.toFixed(2));
  };

  const handleStart = () => {
    try {
      if (balance < betAmount) {
        toast.error("Saldo insuficiente para realizar esta aposta.");
        return;
      }
      if (betAmount <= 0) {
        toast.error("O valor da aposta deve ser maior que zero.");
        return;
      }
      
      onBet(betAmount);
      setIsPlaying(true);
      setRevealedCount(0);
      setNextMultiplier(calculateMultiplier(mineCount, 0));
      setGrid(Array(25).fill({ status: 'hidden' }));
      
      // Randomly place mines
      const newMines: number[] = [];
      while (newMines.length < mineCount) {
        const pos = Math.floor(Math.random() * 25);
        if (!newMines.includes(pos)) newMines.push(pos);
      }
      setMines(newMines);
      startBgMusic();
    } catch (error) {
      console.error("Erro ao iniciar o jogo Mines:", error);
      toast.error("Ocorreu um erro ao iniciar o jogo. Por favor, tente novamente.");
      setIsPlaying(false);
    }
  };

  const handleCellClick = (index: number) => {
    try {
      if (!isPlaying || grid[index].status !== 'hidden') return;

      if (mines.includes(index)) {
        // Hit a mine!
        const newGrid = [...grid];
        mines.forEach(m => {
          newGrid[m] = { status: 'mine' };
        });
        setGrid(newGrid);
        setIsPlaying(false);
        toast.error("BOMBA! Que azar, você perdeu esta rodada.");
      } else {
        // Safe!
        const newGrid = [...grid];
        newGrid[index] = { status: 'safe' };
        setGrid(newGrid);
        const newRevealedCount = revealedCount + 1;
        setRevealedCount(newRevealedCount);
        setNextMultiplier(calculateMultiplier(mineCount, newRevealedCount));
        toast.success("Seguro! Continue assim.");
      }
    } catch (error) {
      console.error("Erro ao processar clique na célula:", error);
      toast.error("Ops! Algo deu errado ao revelar o campo.");
    }
  };

  const handleCashout = () => {
    try {
      if (!isPlaying || revealedCount === 0) return;
      const currentMult = calculateMultiplier(mineCount, revealedCount - 1);
      const win = betAmount * currentMult;
      toast.success(`Parabéns! Você fez o saque de ${win.toFixed(2)} MT!`);
      setIsPlaying(false);
      
      // Reveal everything
      const newGrid = [...grid];
      mines.forEach(m => {
        newGrid[m] = { status: 'mine' };
      });
      setGrid(newGrid);
    } catch (error) {
      console.error("Erro ao realizar saque:", error);
      toast.error("Erro ao processar o seu saque. Por favor, tente novamente.");
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-[#0b0f1a] flex flex-col font-sans text-white overflow-hidden animate-in fade-in duration-300">
      {/* Background Particles Sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-md border-b border-white/5 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            <Diamond className="text-white fill-current" size={16} />
          </div>
          <span className="font-black italic tracking-tighter text-xl">MINES</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            <span className="text-xs font-black text-blue-400">{balance.toFixed(2)} MT</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Game Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center py-6 px-4">
        {/* Next Multiplier Card */}
        <div className="w-full max-w-sm mb-6 relative">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4 text-center">
             <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Próximo Multiplicador</div>
             <div className="text-4xl font-black text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.4)] tracking-tighter italic">
               {nextMultiplier.toFixed(2)}x
             </div>
          </div>
        </div>

        {/* Mines Grid */}
        <div className="grid grid-cols-5 gap-2 w-full max-w-sm aspect-square p-2 bg-black/20 rounded-2xl border border-white/5">
           {grid.map((cell, i) => (
             <button
               key={i}
               onClick={() => handleCellClick(i)}
               disabled={!isPlaying || cell.status !== 'hidden'}
               className={`relative rounded-xl transition-all duration-300 transform active:scale-90 flex items-center justify-center overflow-hidden
                 ${cell.status === 'hidden' ? 'bg-white/10 hover:bg-white/15 border-b-4 border-black/40 shadow-lg' : ''}
                 ${cell.status === 'safe' ? 'bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.5)] border-blue-400' : ''}
                 ${cell.status === 'mine' ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] border-red-400' : ''}
               `}
             >
                {cell.status === 'hidden' && <div className="w-1.5 h-1.5 bg-white/20 rounded-full" />}
                {cell.status === 'safe' && <Diamond className="text-white fill-current animate-in zoom-in" size={20} />}
                {cell.status === 'mine' && <Bomb className="text-white fill-current animate-bounce" size={20} />}
             </button>
           ))}
        </div>

        {/* Stats footer */}
        <div className="mt-4 flex gap-4 text-[10px] font-black text-gray-500 tracking-wider">
           <div className="flex items-center gap-1.5">
              <Diamond size={12} className="text-blue-400" />
              <span>ACERTOS: {revealedCount}</span>
           </div>
           <div className="flex items-center gap-1.5">
              <Bomb size={12} className="text-red-400" />
              <span>MINAS: {mineCount}</span>
           </div>
        </div>
      </div>

      {/* Betting Panel */}
      <div className="bg-[#0f0f0f] p-5 pb-10 rounded-t-[3rem] border-t border-white/5 relative z-30 shadow-[0_-20px_60px_rgba(0,0,0,0.8)]">
        <div className="flex gap-4 mb-4 border-b border-white/5">
          <button className="pb-3 border-b-2 border-blue-500 text-blue-400 font-black tracking-wider text-[10px] px-2 uppercase">Aposta</button>
          <button className="pb-3 text-gray-600 font-bold tracking-wider text-[10px] px-2 uppercase hover:text-gray-400">Automático</button>
        </div>

        <div className="flex flex-col gap-5">
           <div className="flex gap-2 overflow-x-auto no-scrollbar mb-2">
              {[1, 5, 10, 50].map(v => (
                <button 
                  key={v} 
                  onClick={() => !isPlaying && setBetAmount(prev => prev + v)} 
                  disabled={isPlaying}
                  className="bg-black/40 border border-white/5 px-4 py-2 rounded-xl text-[10px] font-black text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40"
                >
                  +{v}
                </button>
              ))}
           </div>
           
           <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                 <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest pl-1">Valor da Aposta</span>
                 <div className="bg-black/40 rounded-xl p-1 flex items-center border border-white/5 h-12">
                   <button onClick={() => !isPlaying && setBetAmount(Math.max(1, betAmount - 1))} className="w-10 h-full flex items-center justify-center text-gray-500">-</button>
                   <input 
                     type="number" 
                     value={betAmount}
                     disabled={isPlaying}
                     onChange={(e) => setBetAmount(Number(e.target.value))}
                     onBlur={(e) => {
                       const val = Number(e.target.value);
                       if (isNaN(val) || val < 1) setBetAmount(1);
                     }}
                     inputMode="numeric"
                     className="flex-1 bg-transparent text-center font-black text-sm italic outline-none w-full"
                   />
                   <button onClick={() => !isPlaying && setBetAmount(betAmount + 1)} className="w-10 h-full flex items-center justify-center text-gray-500">+</button>
                 </div>
              </div>
              <div className="flex flex-col gap-1.5">
                 <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest pl-1">Minas</span>
                 <div className="bg-black/40 rounded-xl flex items-center border border-white/5 h-12 relative px-4 group cursor-pointer" onClick={() => !isPlaying && setMineCount(m => m >= 24 ? 1 : m + 1)}>
                   <span className="flex-1 text-sm font-black text-blue-400">{mineCount}</span>
                   <ChevronDown size={14} className="text-gray-500" />
                 </div>
              </div>
           </div>

           {!isPlaying ? (
             <button 
               onClick={handleStart}
               className="w-full py-4.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-black text-lg tracking-widest shadow-[0_10px_25px_rgba(37,99,235,0.4)] active:scale-[0.98] transition-all"
             >
               APOSTAR
             </button>
           ) : (
             <button 
               onClick={handleCashout}
               disabled={revealedCount === 0}
               className={`w-full py-4.5 rounded-2xl font-black text-lg tracking-widest transition-all active:scale-[0.98]
                 ${revealedCount === 0 ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-green-600 to-emerald-500 shadow-[0_10px_25px_rgba(16,185,129,0.3)]'}
               `}
             >
               SAQUE {(betAmount * calculateMultiplier(mineCount, revealedCount - 1)).toFixed(2)} MT
             </button>
           )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default MinesGame;
