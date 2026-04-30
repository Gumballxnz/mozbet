"use client";

import { useState, useEffect } from "react";
import { X, Trophy, Users, History, Info, Play, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { startBgMusic } from "@/lib/sounds";

interface AugustusCrashGameProps {
  onClose: () => void;
  balance: number;
  onBet: (amount: number) => void;
}

const AugustusCrashGame = ({ onClose, balance, onBet }: AugustusCrashGameProps) => {
  const [betAmount, setBetAmount] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [multiplier, setMultiplier] = useState(1.0);
  const [isCrashed, setIsCrashed] = useState(false);
  const [history, setHistory] = useState([1.54, 2.1, 1.05, 12.4, 1.87]);
  const [playersOnline, setPlayersOnline] = useState(1243);

  useEffect(() => {
    let interval: any;
    if (isPlaying && !isCrashed) {
      interval = setInterval(() => {
        setMultiplier((prev) => {
          const next = prev + 0.01 * (prev > 2 ? 1.5 : 1);
          // 1% chance of crash every 100ms
          if (Math.random() < 0.01 * (prev / 2.5)) {
            setIsCrashed(true);
            setIsPlaying(false);
            toast.error(`Crashou em ${next.toFixed(2)}x`);
            setHistory(prevH => [next, ...prevH.slice(0, 5)]);
          }
          return next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isCrashed]);

  useEffect(() => {
    const pInterval = setInterval(() => {
      setPlayersOnline(prev => prev + Math.floor(Math.random() * 11) - 5);
    }, 5000);
    return () => clearInterval(pInterval);
  }, []);

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
      setHistory(prevH => [multiplier, ...prevH.slice(0, 5)]);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-[#0d0d0d] flex flex-col font-sans text-white overflow-hidden animate-in fade-in duration-300">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[60%] bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.15)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-md border-b border-white/5 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)]">
            <Trophy className="text-white" size={16} />
          </div>
          <span className="font-black italic tracking-tighter text-xl text-purple-400">AUGUSTUS <span className="text-white">CRASH</span></span>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-green-500 tracking-wider">{playersOnline} Online</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Game Stage */}
      <div className="flex-1 relative flex flex-col items-center justify-center pt-8 overflow-hidden">
        {/* History Caps */}
        <div className="absolute top-4 left-0 right-0 flex justify-center gap-2 px-4 z-20">
          {history.map((val, i) => (
            <div key={i} className={`px-3 py-1 rounded-full text-[10px] font-black border backdrop-blur-md ${val >= 2 ? 'bg-purple-600/30 border-purple-500/40 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'bg-white/5 border-white/10 text-gray-400'}`}>
              {val.toFixed(2)}x
            </div>
          ))}
        </div>

        {/* Multiplier Center */}
        <div className="relative z-20 text-center flex flex-col items-center gap-2">
           <div className={`text-6xl sm:text-7xl font-black italic tracking-tighter drop-shadow-[0_0_30px_rgba(234,179,8,0.3)] transition-all duration-300 ${isCrashed ? 'text-red-500 scale-90' : 'text-yellow-400'}`}>
             {multiplier.toFixed(2)}x
           </div>
           <div className={`px-4 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-gray-500 tracking-[0.2em] transition-opacity ${isPlaying ? 'opacity-100' : 'opacity-0'}`}>
             SUBINDO...
           </div>
        </div>

        {/* Character Illustration - Styled Augustus */}
        <div className={`mt-8 relative transition-all duration-1000 transform ${isPlaying ? 'scale-110 -translate-y-12' : 'scale-100'}`}>
          <div className="absolute -inset-10 bg-purple-600/10 blur-[50px] rounded-full animate-pulse" />
          <svg width="180" height="180" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)]">
             {/* Simple stylized roman/lutador character */}
             <circle cx="100" cy="100" r="80" fill="#1a1a1a" stroke="#a855f7" strokeWidth="2" />
             <path d="M60 80C60 60 140 60 140 80V130C140 152.091 122.091 170 100 170C77.9086 170 60 152.091 60 130V80Z" fill="#222" stroke="#a855f7" strokeWidth="1" />
             <rect x="70" y="40" width="60" height="20" rx="10" fill="#a855f7" />
             <path d="M100 40V20" stroke="#a855f7" strokeWidth="4" strokeLinecap="round" />
             <circle cx="85" cy="95" r="4" fill="#a855f7" />
             <circle cx="115" cy="95" r="4" fill="#a855f7" />
             <path d="M85 125C85 125 90 135 100 135C110 135 115 125 115 125" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Vertical Spotlight Beam */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-48 bg-gradient-to-b from-purple-600/10 via-transparent to-transparent opacity-50 blur-xl pointer-events-none" />
      </div>

      {/* Betting Panel */}
      <div className="bg-[#121212] p-5 pb-8 rounded-t-[2.5rem] border-t border-white/5 relative z-30 shadow-[0_-15px_50px_rgba(0,0,0,0.8)]">
        <div className="flex gap-4 mb-5 border-b border-white/5">
          <button className="pb-3 border-b-2 border-purple-500 text-purple-400 font-black tracking-wider text-xs px-2 uppercase">Aposta</button>
          <button className="pb-3 text-gray-500 font-bold tracking-wider text-xs px-2 uppercase hover:text-gray-300">Auto</button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-black/40 p-1.5 rounded-2xl border border-white/5 flex items-center">
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
             <div className="grid grid-cols-2 gap-2">
                {[10, 20, 50, 100].slice(0, 4).map(val => (
                  <button key={val} onClick={() => !isPlaying && setBetAmount(prev => prev + val)} disabled={isPlaying} className="bg-white/5 border border-white/5 rounded-xl py-1 text-[10px] font-black text-gray-400 hover:bg-white/10 disabled:opacity-40">{val}</button>
                ))}
             </div>
          </div>

          {!isPlaying ? (
            <button 
              onClick={handleStart}
              className="w-full py-4.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-black text-lg tracking-wider shadow-[0_8px_30px_rgba(37,99,235,0.4)] active:scale-[0.98] transition-all"
            >
              APOSTA
            </button>
          ) : (
            <button 
              onClick={handleCashout}
              className="w-full py-4.5 bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl font-black text-lg tracking-wider shadow-[0_8px_30px_rgba(168,85,247,0.4)] active:scale-[0.98] transition-all"
            >
              LEVANTAR {(betAmount * multiplier).toFixed(2)} MT
            </button>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between px-2 opacity-50">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
             <TrendingUp size={12} />
             <span>MAX WIN: 50.00x</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
             <Users size={12} />
             <span>{playersOnline} JOGANDO</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AugustusCrashGame;
