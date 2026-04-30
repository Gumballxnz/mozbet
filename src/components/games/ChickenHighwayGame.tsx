"use client";

import { useState, useEffect } from "react";
import { X, Trophy, Users, Info, Settings, Play, Shield, Clock } from "lucide-react";
import { toast } from "sonner";
import { startBgMusic } from "@/lib/sounds";

interface ChickenHighwayGameProps {
  onClose: () => void;
  balance: number;
  onBet: (amount: number) => void;
}

const ChickenHighwayGame = ({ onClose, balance, onBet }: ChickenHighwayGameProps) => {
  const [betAmount, setBetAmount] = useState(10);
  const [difficulty, setDifficulty] = useState("FÃ¡cil");
  const [isPlaying, setIsPlaying] = useState(false);
  const [multiplier, setMultiplier] = useState(1.0);
  const [isCrashed, setIsCrashed] = useState(false);
  const [history, setHistory] = useState([1.54, 2.1, 1.05, 12.4, 1.87]);

  useEffect(() => {
    let interval: any;
    if (isPlaying && !isCrashed) {
      interval = setInterval(() => {
        setMultiplier((prev) => {
          const next = prev + 0.01 * (prev > 2 ? 2 : 1);
          if (Math.random() < 0.01 * (prev / 2)) {
            setIsCrashed(true);
            setIsPlaying(false);
            toast.error(`A galinha foi atropelada! ${next.toFixed(2)}x`);
            setHistory(prevH => [next, ...prevH.slice(0, 4)]);
          }
          return next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isCrashed]);

  const handleStart = () => {
    if (balance < betAmount) {
      toast.error("Saldo insuficiente");
      return;
    }
    onBet(betAmount);
    setIsPlaying(true);
    setIsCrashed(false);
    setMultiplier(1.0);
    startBgMusic();
  };

  const handleCashout = () => {
    if (isPlaying && !isCrashed) {
      const win = betAmount * multiplier;
      toast.success(`VocÃª ganhou ${win.toFixed(2)} MT!`);
      setIsPlaying(false);
      setHistory(prevH => [multiplier, ...prevH.slice(0, 4)]);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-[#0a0a0a] flex flex-col font-sans text-white overflow-hidden animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.3)]">
            <Play className="text-black fill-current" size={16} />
          </div>
          <span className="font-black italic tracking-tighter text-xl">CHICKEN HIGHWAY</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white/5 px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        {/* Background Split */}
        <div className="absolute inset-0 flex">
          {/* Desert Area */}
          <div className="w-1/2 bg-gradient-to-br from-[#d4a373] to-[#a98467] relative overflow-hidden">
            {/* Cactuses and stones */}
            <div className="absolute top-1/4 left-1/4 w-4 h-8 bg-[#2d6a4f] rounded-full" />
            <div className="absolute top-2/3 left-1/3 w-3 h-6 bg-[#2d6a4f] rounded-full" />
            <div className="absolute top-1/2 left-1/2 w-6 h-3 bg-stone-600/30 rounded-full blur-[1px]" />
            <div className="absolute inset-0 bg-black/10" />
          </div>
          {/* Highway Area */}
          <div className="w-1/2 bg-[#1a1a1a] relative overflow-hidden">
            {/* Highway lines */}
            <div className="absolute inset-0 flex justify-center">
              <div className="w-1 h-full border-r-2 border-dashed border-white/20" />
            </div>
            {/* Speed lines effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i}
                  className="absolute left-1/2 -translate-x-1/2 w-[1px] h-20 bg-white/10"
                  style={{ 
                    top: `${i * 30}%`, 
                    animation: `highway-speed 0.5s linear infinite`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* History Caps */}
        <div className="absolute top-4 left-0 right-0 z-10 flex justify-center gap-2 px-4 overflow-x-auto no-scrollbar">
          {history.map((val, i) => (
            <div key={i} className={`px-3 py-1 rounded-full text-[10px] font-black border backdrop-blur-md ${val >= 2 ? 'bg-purple-500/20 border-purple-500/30 text-purple-400' : 'bg-blue-500/20 border-blue-500/30 text-blue-400'}`}>
              {val.toFixed(2)}x
            </div>
          ))}
        </div>

        {/* Main Character and Car */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* Multiplier Center */}
          <div className={`relative z-20 w-32 h-32 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xl border-4 ${isCrashed ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]' : 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]'} transition-all duration-300`}>
             <span className="text-4xl font-black italic tracking-tighter">
               {multiplier.toFixed(2)}x
             </span>
          </div>

          {/* Chicken (Left) */}
          <div className="absolute left-[20%] top-1/2 -translate-y-1/2 transition-all duration-500" style={{ transform: isPlaying ? 'translateY(-10px)' : 'none' }}>
            <div className="relative w-16 h-16 bg-white rounded-full shadow-lg border-2 border-gray-100 flex items-center justify-center overflow-hidden">
              <div className="absolute top-2 w-4 h-2 bg-red-500 rounded-t-full" />
              <div className="w-10 h-10 bg-yellow-400 rounded-full" />
              <div className="absolute bottom-2 w-8 h-4 bg-orange-400 rounded-b-full" />
            </div>
          </div>

          {/* Car (Right) */}
          <div className={`absolute right-[20%] top-1/2 -translate-y-1/2 w-20 h-32 bg-[#222] rounded-xl shadow-2xl border border-white/5 transition-all duration-100 ${isPlaying ? 'animate-bounce' : ''}`}>
            {/* Top View Car Details */}
            <div className="absolute inset-x-2 top-4 h-12 bg-[#111] rounded-lg" />
            <div className="absolute inset-x-1 bottom-2 flex justify-between">
              <div className="w-4 h-1.5 bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.6)]" />
              <div className="w-4 h-1.5 bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.6)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Betting Panel */}
      <div className="bg-[#121212] p-5 pb-8 rounded-t-[2.5rem] border-t border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between items-center mb-4 px-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Saldo</span>
            <span className="text-sm font-black text-green-500">{balance.toFixed(2)} MT</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Aposta</span>
            <span className="text-sm font-black text-white">{betAmount} MT</span>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3 px-1">
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

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-black/40 p-1 rounded-2xl border border-white/5 flex items-center">
            <button onClick={() => !isPlaying && setBetAmount(Math.max(1, betAmount - 1))} className="w-10 h-10 flex items-center justify-center text-xl font-bold text-gray-400 hover:text-white">-</button>
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
              className="flex-1 bg-transparent text-center font-black text-lg outline-none w-full"
            />
            <button onClick={() => !isPlaying && setBetAmount(betAmount + 1)} className="w-10 h-10 flex items-center justify-center text-xl font-bold text-gray-400 hover:text-white">+</button>
          </div>
          
          <button 
            onClick={() => setDifficulty(d => d === "FÃ¡cil" ? "MÃ©dio" : d === "MÃ©dio" ? "DifÃ­cil" : "FÃ¡cil")}
            className="bg-black/40 border border-white/5 rounded-2xl flex flex-col items-center justify-center px-4"
          >
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">Dificuldade</span>
            <span className="text-sm font-black text-yellow-500">{difficulty}</span>
          </button>
        </div>

        {!isPlaying ? (
          <button 
            onClick={handleStart}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-green-500 rounded-2xl font-black text-lg tracking-wider shadow-[0_8px_25px_rgba(34,197,94,0.3)] active:scale-[0.98] transition-all"
          >
            INICIAR
          </button>
        ) : (
          <button 
            onClick={handleCashout}
            className="w-full py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-2xl font-black text-lg tracking-wider shadow-[0_8px_25px_rgba(234,179,8,0.3)] active:scale-[0.98] transition-all"
          >
            LEVANTAR {(betAmount * multiplier).toFixed(2)} MT
          </button>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes highway-speed {
          from { transform: translateX(-50%) translateY(-100px); }
          to { transform: translateX(-50%) translateY(500px); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default ChickenHighwayGame;
