"use client";

import { useState, useEffect } from "react";
import { X, Train, Info, History, Play, Users, Gauge, Timer } from "lucide-react";
import { toast } from "sonner";
import { startBgMusic } from "@/lib/sounds";

interface SubwayCrashGameProps {
  onClose: () => void;
  balance: number;
  onBet: (amount: number) => void;
}

const SubwayCrashGame = ({ onClose, balance, onBet }: SubwayCrashGameProps) => {
  const [betAmount, setBetAmount] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [multiplier, setMultiplier] = useState(1.0);
  const [isCrashed, setIsCrashed] = useState(false);
  const [history, setHistory] = useState([1.54, 1.05, 4.21, 1.87, 2.33]);

  useEffect(() => {
    let interval: any;
    if (isPlaying && !isCrashed) {
      interval = setInterval(() => {
        setMultiplier((prev) => {
          const next = prev + 0.01 * (prev > 2 ? 2 : 1);
          if (Math.random() < 0.012 * (prev / 2)) {
            setIsCrashed(true);
            setIsPlaying(false);
            toast.error(`Pegou o trem! ${next.toFixed(2)}x`);
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
      toast.success(`Escapou! Você ganhou ${win.toFixed(2)} MT!`);
      setIsPlaying(false);
      setHistory(prevH => [multiplier, ...prevH.slice(0, 5)]);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-[#0a0a0a] flex flex-col font-sans text-white overflow-hidden animate-in fade-in duration-300">
      {/* Background Subway Tunnel */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#111] to-[#000]" />
      
      {/* Moving Tunnel Rails and Lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none perspective-[500px]">
        {/* Rails */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-full bg-[#1a1a1a] origin-bottom transform rotateX(60deg)" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[2px] h-full bg-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.2)] origin-bottom transform rotateX(60deg) -translate-x-20" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[2px] h-full bg-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.2)] origin-bottom transform rotateX(60deg) translate-x-20" />
        
        {/* Moving Lines */}
        {[...Array(6)].map((_, i) => (
          <div 
            key={i}
            className="absolute left-1/2 -translate-x-1/2 w-48 h-2 bg-white/5"
            style={{ 
              top: `${i * 20}%`,
              animation: isPlaying ? `subway-speed 0.3s linear infinite` : 'none',
              animationDelay: `${i * 0.05}s`
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-md border-b border-white/5 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.4)]">
            <Train className="text-white" size={16} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-black italic tracking-tighter text-lg uppercase text-yellow-500">Subway</span>
            <span className="font-black italic tracking-tighter text-xs uppercase text-white">Crash</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white/5 px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{balance.toFixed(2)} MT</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Stats and History */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/40 relative z-10 border-b border-white/5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {history.map((val, i) => (
            <div key={i} className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border ${val >= 2 ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-500' : 'bg-white/5 border-white/10 text-gray-500'}`}>
              {val.toFixed(2)}x
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 text-[9px] font-bold text-green-500 tracking-tighter">
           <Users size={10} />
           <span>2,842 JOGANDO</span>
        </div>
      </div>

      {/* Game Gameplay Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center pt-10">
        {/* Multiplier Center */}
        <div className="relative z-20 text-center flex flex-col items-center">
           <div className={`text-7xl font-black italic tracking-tighter transition-all duration-300 ${isCrashed ? 'text-red-600 scale-90' : 'text-white drop-shadow-[0_0_40px_rgba(255,255,0,0.2)]'}`}>
             {multiplier.toFixed(2)}x
           </div>
           <div className={`mt-2 flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full transition-opacity ${isPlaying ? 'opacity-100' : 'opacity-0'}`}>
              <Gauge size={12} className="text-yellow-500 animate-pulse" />
              <span className="text-[9px] font-black text-yellow-500 tracking-widest uppercase">Velocidade Máxima</span>
           </div>
        </div>

        {/* Character Animation - Styled runner */}
        <div className={`mt-12 relative ${isPlaying ? 'animate-bounce' : ''}`}>
           {/* Visual Glow */}
           <div className="absolute -inset-10 bg-yellow-500/5 blur-[40px] rounded-full animate-pulse" />
           
           {/* Runner Placeholder/Shape */}
           <div className="relative flex flex-col items-center">
              <div className="w-10 h-10 bg-[#333] border-2 border-yellow-500/40 rounded-full" />
              <div className="w-12 h-16 bg-[#222] border-2 border-yellow-500/40 rounded-t-xl mt-1" />
              {/* Speed particles */}
              {isPlaying && (
                <>
                  <div className="absolute -left-8 top-1/2 w-6 h-0.5 bg-white/20 blur-[1px] animate-pulse" />
                  <div className="absolute -right-8 top-1/3 w-8 h-0.5 bg-white/20 blur-[1px] animate-pulse" />
                </>
              )}
           </div>
        </div>
      </div>

      {/* Betting Panels Container */}
      <div className="bg-[#0f0f0f] p-4 pb-8 rounded-t-[2.5rem] border-t border-white/5 relative z-30 shadow-[0_-15px_50px_rgba(0,0,0,0.9)]">
        {/* Betting Options */}
        <div className="grid grid-cols-2 gap-4 mb-4">
           {/* Panel 1 */}
           <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col gap-3">
              <div className="flex justify-between items-center text-[10px] font-black text-gray-500 uppercase">
                 <span>Manual</span>
                 <span>Auto</span>
              </div>
              <div className="bg-black/40 rounded-xl p-1 flex items-center h-10 border border-white/5">
                 <button onClick={() => !isPlaying && setBetAmount(Math.max(1, betAmount - 1))} className="w-8 h-full flex items-center justify-center text-gray-500">-</button>
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
                <button onClick={() => !isPlaying && setBetAmount(betAmount + 1)} className="w-8 h-full flex items-center justify-center text-gray-500">+</button>
              </div>
              {!isPlaying ? (
                <button 
                  onClick={handleStart}
                  className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-black text-xs tracking-wider shadow-[0_5px_15px_rgba(234,179,8,0.3)]"
                >
                  CORRER
                </button>
              ) : (
                <button 
                  onClick={handleCashout}
                  className="w-full py-3 bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl font-black text-xs tracking-wider"
                >
                  SAIR
                </button>
              )}
           </div>

           {/* Panel 2 (Reused style) */}
           <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col gap-3 opacity-50">
              <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase">
                 <span>Manual</span>
                 <span>Auto</span>
              </div>
              <div className="bg-black/40 rounded-xl p-1 flex items-center h-10 border border-white/5">
                <div className="flex-1 text-center font-black text-sm italic">50</div>
              </div>
              <button className="w-full py-3 bg-gray-800 rounded-xl font-black text-xs tracking-wider cursor-not-allowed">
                 CORRER
              </button>
           </div>
        </div>

        {/* Quick Values */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-2">
           {[10, 50, 100, 500, 1000].map(v => (
             <button key={v} onClick={() => !isPlaying && setBetAmount(prev => prev + v)} disabled={isPlaying} className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-lg text-[10px] font-black text-gray-400 hover:text-white transition-colors disabled:opacity-40">+{v}</button>
           ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes subway-speed {
          from { transform: translateX(-50%) translateY(-50px); opacity: 0; }
          to { transform: translateX(-50%) translateY(300px); opacity: 0.1; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default SubwayCrashGame;
