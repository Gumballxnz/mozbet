"use client";

import { useState, useEffect } from "react";
import { X, Ship, Info, SwitchCamera, Settings, Fish, Wind } from "lucide-react";
import { toast } from "sonner";
import { startBgMusic } from "@/lib/sounds";

interface FishinatorGameProps {
  onClose: () => void;
  balance: number;
  onBet: (amount: number) => void;
}

const FishinatorGame = ({ onClose, balance, onBet }: FishinatorGameProps) => {
  const [betAmount, setBetAmount] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [multiplier, setMultiplier] = useState(1.0);
  const [isCrashed, setIsCrashed] = useState(false);
  const [history, setHistory] = useState([1.54, 2.1, 1.05, 12.4, 1.87]);

  useEffect(() => {
    let interval: any;
    if (isPlaying && !isCrashed) {
      interval = setInterval(() => {
        setMultiplier((prev) => {
          const next = prev + 0.01;
          if (Math.random() < 0.01 * (prev / 3)) {
            setIsCrashed(true);
            setIsPlaying(false);
            toast.error(`O peixe fugiu! ${next.toFixed(2)}x`);
            setHistory(prevH => [next, ...prevH.slice(0, 5)]);
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
      toast.success(`Pescado! Você ganhou ${win.toFixed(2)} MT!`);
      setIsPlaying(false);
      setHistory(prevH => [multiplier, ...prevH.slice(0, 5)]);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-[#001d3d] flex flex-col font-sans text-white overflow-hidden animate-in fade-in duration-300">
      {/* Background Ocean Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#003566] via-[#001d3d] to-[#000814]" />
      
      {/* Animated Bubbles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div 
            key={i}
            className="absolute bg-white/10 rounded-full animate-bubble"
            style={{
              width: `${Math.random() * 8 + 4}px`,
              height: `${Math.random() * 8 + 4}px`,
              left: `${Math.random() * 100}%`,
              bottom: `-20px`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 3 + 4}s`
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-md border-b border-white/5 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            <Ship className="text-white" size={16} />
          </div>
          <span className="font-black italic tracking-tighter text-xl">FISHINATOR</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* History */}
      <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar relative z-10 bg-black/20">
        {history.map((val, i) => (
          <div key={i} className={`px-3 py-1 rounded-full text-[10px] font-black border ${val >= 2 ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' : 'bg-white/5 border-white/10 text-gray-500'}`}>
            {val.toFixed(2)}x
          </div>
        ))}
      </div>

      {/* Main Gameplay Area */}
      <div className="flex-1 relative flex flex-col items-center">
        {/* Boat and Fisherman */}
        <div className="mt-8 relative transition-transform duration-1000 transform" style={{ transform: isPlaying ? 'translateY(10px)' : 'none' }}>
           <div className="relative z-20">
             {/* Stylized Boat SVG */}
             <svg width="120" height="60" viewBox="0 0 120 60" fill="none">
                <path d="M10 30L30 50H90L110 30H10Z" fill="#334155" stroke="white" strokeWidth="1" />
                <rect x="55" y="10" width="4" height="20" fill="#475569" />
                <circle cx="65" cy="15" r="5" fill="#ef4444" />
             </svg>
             {/* Fisherman */}
             <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-8 h-12 bg-white/10 rounded-t-xl border border-white/20" />
           </div>
           
           {/* Fishing Line */}
           <div 
             className="absolute left-1/2 top-[30px] w-0.5 bg-white/40 origin-top transition-all duration-300" 
             style={{ height: isPlaying ? '200px' : '40px' }} 
           />
        </div>

        {/* Multiplier Center */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-20">
           <div className={`text-7xl font-black italic tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all duration-300 ${isCrashed ? 'text-red-500' : 'text-white'}`}>
             {multiplier.toFixed(2)}x
           </div>
           <div className="mt-4 flex items-center gap-2 text-blue-400 font-bold tracking-widest text-[10px] uppercase">
              <Wind size={12} className="animate-pulse" />
              <span>Mar Agitado</span>
           </div>
        </div>

        {/* Floating Fish */}
        {isPlaying && (
          <div className="absolute bottom-1/4 animate-bounce">
            <Fish className="text-blue-300 rotate-12" size={40} />
          </div>
        )}
      </div>

      {/* Betting Panel */}
      <div className="bg-[#020617] p-6 pb-10 rounded-t-[3rem] border-t border-white/5 relative z-20 shadow-[0_-20px_50px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Valor da Isca</span>
              <div className="bg-white/5 rounded-2xl border border-white/5 p-1 flex items-center">
                <button onClick={() => !isPlaying && setBetAmount(Math.max(1, betAmount - 1))} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white">-</button>
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
                <button onClick={() => !isPlaying && setBetAmount(betAmount + 1)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white">+</button>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Modo Auto</span>
              <div className="bg-white/5 rounded-2xl border border-white/5 h-[50px] flex items-center justify-between px-4">
                 <span className="text-xs font-bold text-gray-400">DESLIGADO</span>
                 <div className="w-10 h-5 bg-white/10 rounded-full relative">
                    <div className="absolute left-1 top-1 w-3 h-3 bg-gray-500 rounded-full" />
                 </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-2 px-1">
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
              className="w-full py-4.5 bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl font-black text-xl tracking-wider shadow-[0_8px_30px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-all"
            >
              LANÇAR LINHA
            </button>
          ) : (
            <button 
              onClick={handleCashout}
              className="w-full py-4.5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl font-black text-xl tracking-wider shadow-[0_8px_30px_rgba(37,99,235,0.4)] active:scale-[0.98] transition-all"
            >
              PESCAR {(betAmount * multiplier).toFixed(2)} MT
            </button>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bubble {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          20% { opacity: 0.5; }
          100% { transform: translateY(-400px) scale(1.5); opacity: 0; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default FishinatorGame;
