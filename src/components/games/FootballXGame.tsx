"use client";

import { useState, useEffect } from "react";
import { X, Trophy, History, Play, Users, Goal, Timer } from "lucide-react";
import { toast } from "sonner";
import { startBgMusic } from "@/lib/sounds";

interface FootballXGameProps {
  onClose: () => void;
  balance: number;
  onBet: (amount: number) => void;
}

const FootballXGame = ({ onClose, balance, onBet }: FootballXGameProps) => {
  const [betAmount, setBetAmount] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [multiplier, setMultiplier] = useState(1.0);
  const [isCrashed, setIsCrashed] = useState(false);
  const [history, setHistory] = useState([1.14, 2.54, 1.02, 3.12, 1.95]);
  const [targetCrash, setTargetCrash] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isPlaying && !isCrashed) {
      interval = setInterval(() => {
        setMultiplier((prev) => {
          const next = prev + 0.02 * (prev > 1.5 ? 1.5 : 1);
          if (next >= targetCrash) {
            setIsCrashed(true);
            setIsPlaying(false);
            toast.error(`Perdeu a bola! ${targetCrash.toFixed(2)}x`);
            setHistory(prevH => [targetCrash, ...prevH.slice(0, 5)]);
            return targetCrash;
          }
          return next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isCrashed, targetCrash]);

  const handleStart = async () => {
    if (balance < betAmount) {
      toast.error("Saldo insuficiente");
      return;
    }

    try {
      const res = await fetch("/api/game/crash/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betAmount, gameId: "football-x" })
      });
      const data = await res.json();
      if (data.success) {
        onBet(data.newBalance); 
        setTargetCrash(data.crashPoint);
        setIsPlaying(true);
        setIsCrashed(false);
        setMultiplier(1.0);
        startBgMusic();
      } else {
        toast.error(data.error);
      }
    } catch (e) {
      toast.error("Erro ao iniciar jogo.");
    }
  };

  const handleCashout = async () => {
    if (isPlaying && !isCrashed) {
      try {
        const res = await fetch("/api/game/crash/cashout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ betAmount, multiplier, gameId: "football-x" })
        });
        const data = await res.json();
        if (data.success) {
          toast.success(`GOL! Você ganhou ${(betAmount * multiplier).toFixed(2)} MT!`);
          setIsPlaying(false);
          setHistory(prevH => [multiplier, ...prevH.slice(0, 5)]);
          onBet(data.newBalance);
        }
      } catch (e) {
        toast.error("Erro na retirada.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-[#051101] flex flex-col font-sans text-white overflow-hidden animate-in fade-in duration-300">
      {/* Background Stadium at Night */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.1)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.8)_100%)]" />
      
      {/* Field grid effect */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '100px 100px' }} />

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-md border-b border-white/5 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.4)]">
            <Goal className="text-white" size={16} />
          </div>
          <span className="font-black italic tracking-tighter text-xl text-green-400 uppercase">Football<span className="text-white">X</span></span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* History */}
      <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar relative z-10">
        {history.map((val, i) => (
          <div key={i} className={`px-4 py-1 rounded-full text-[10px] font-black border backdrop-blur-md ${val >= 2 ? 'bg-green-600/20 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 text-gray-500'}`}>
            {val.toFixed(2)}x
          </div>
        ))}
      </div>

      {/* Arena Stage */}
      <div className="flex-1 relative flex flex-col items-center justify-center">
        {/* Progress side bar */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 w-1.5 h-1/2 bg-white/5 rounded-full overflow-hidden">
           <div 
             className="w-full bg-gradient-to-t from-green-600 to-green-400 shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-all duration-300"
             style={{ height: `${Math.min((multiplier - 1) * 20, 100)}%` }}
           />
        </div>

        {/* Multiplier Center */}
        <div className="relative z-20 text-center flex flex-col items-center">
           <div className={`text-7xl sm:text-8xl font-black italic tracking-tighter transition-all duration-300 ${isCrashed ? 'text-red-500 scale-90' : 'text-white drop-shadow-[0_0_30px_rgba(34,197,94,0.4)]'}`}>
             {multiplier.toFixed(2)}x
           </div>
           <div className={`mt-2 flex items-center gap-2 text-green-500/60 font-black tracking-widest text-[10px] uppercase transition-opacity ${isPlaying ? 'opacity-100' : 'opacity-0'}`}>
              <Timer size={12} />
              <span>EMBAIXADINHAS</span>
           </div>
        </div>

        {/* Character / Ball Focus */}
        <div className={`mt-12 relative transition-all duration-300 ${isPlaying ? 'animate-bounce' : ''}`}>
           {/* Visual Glow */}
           <div className="absolute -inset-10 bg-green-500/10 blur-[40px] rounded-full animate-pulse" />
           
           {/* Stylized Football Ball */}
           <div className="relative w-32 h-32 rounded-full bg-white shadow-[inset_-10px_-10px_20px_rgba(0,0,0,0.2),0_15px_30px_rgba(0,0,0,0.4)] flex items-center justify-center overflow-hidden border-2 border-black/5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,white_0%,#ccc_100%)]" />
              <svg width="100%" height="100%" viewBox="0 0 100 100">
                <path d="M50 0 L65 35 L100 35 L70 55 L85 100 L50 75 L15 100 L30 55 L0 35 L35 35 Z" fill="#111" opacity="0.1" />
                <path d="M50 0 L100 50 L50 100 L0 50 Z" stroke="#111" strokeWidth="0.5" fill="none" opacity="0.2" />
              </svg>
           </div>
           
           {/* Bottom shadow */}
           <div className="mt-8 w-24 h-4 bg-black/40 blur-lg rounded-full mx-auto" />
        </div>
      </div>

      {/* Betting Panel */}
      <div className="bg-[#0a0a0a] p-6 pb-10 rounded-t-[3rem] border-t border-white/5 relative z-30 shadow-[0_-20px_50px_rgba(0,0,0,0.9)]">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Saldo</span>
              
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sua Aposta</span>
              <span className="text-sm font-black text-white">{betAmount} MT</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl border border-white/5 p-1 flex items-center h-16">
            <button onClick={() => !isPlaying && setBetAmount(Math.max(1, betAmount - 1))} className="w-14 h-full flex items-center justify-center text-2xl font-bold text-gray-500 hover:text-white transition-colors">-</button>
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
              className="flex-1 bg-transparent text-center font-black text-2xl tracking-tighter italic outline-none w-full"
            />
            <button onClick={() => !isPlaying && setBetAmount(betAmount + 1)} className="w-14 h-full flex items-center justify-center text-2xl font-bold text-gray-500 hover:text-white transition-colors">+</button>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-2 px-2">
            {[10, 20, 50, 100].map(v => (
              <button 
                key={v} 
                onClick={() => !isPlaying && setBetAmount(prev => prev + v)} 
                disabled={isPlaying}
                className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-black text-gray-400 hover:text-white transition-colors disabled:opacity-40"
              >
                +{v}
              </button>
            ))}
          </div>

          {!isPlaying ? (
            <button 
              onClick={handleStart}
              className="w-full py-4.5 bg-gradient-to-r from-green-600 to-green-500 rounded-2xl font-black text-xl tracking-wider shadow-[0_10px_30px_rgba(34,197,94,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase"
            >
              <Play size={20} className="fill-current" />
              INICIAR JOGO
            </button>
          ) : (
            <button 
              onClick={handleCashout}
              className="w-full py-4.5 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-2xl font-black text-xl tracking-wider shadow-[0_10px_30px_rgba(234,179,8,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              SAQUE {(betAmount * multiplier).toFixed(2)} MT
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

export default FootballXGame;
