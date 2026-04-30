"use client";

import { useState, useEffect } from "react";
import { X, Waves, Info, MousePointer2, Settings, Trophy, Anchor } from "lucide-react";
import { toast } from "sonner";
import { startBgMusic } from "@/lib/sounds";

interface BottleManiaGameProps {
  onClose: () => void;
  balance: number;
  onBet: (amount: number) => void;
}

const BottleManiaGame = ({ onClose, balance, onBet }: BottleManiaGameProps) => {
  const [betAmount, setBetAmount] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedBottle, setSelectedBottle] = useState(1);
  const [multiplier, setMultiplier] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);

  const bottles = [0, 1, 2];
  const bets = [0.5, 1, 2, 5, 10];

  const handleStart = () => {
    if (balance < betAmount) {
      toast.error("Saldo insuficiente");
      return;
    }
    onBet(betAmount);
    setIsPlaying(true);
    setIsRevealing(true);
    startBgMusic();

    setTimeout(() => {
      const win = Math.random() > 0.5;
      if (win) {
        const mult = (Math.random() * 5 + 1).toFixed(2);
        setMultiplier(Number(mult));
        toast.success(`Ganhou! ${mult}x`);
      } else {
        setMultiplier(0);
        toast.error("Vazio!");
      }
      setIsRevealing(false);
      setIsPlaying(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-[#001219] flex flex-col font-sans text-white overflow-hidden animate-in fade-in duration-300">
      {/* Background Tropical Style */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,18,25,0.7),rgba(0,95,115,0.4)),url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#001219] via-transparent to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-md border-b border-white/5 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(8,145,178,0.4)]">
            <Anchor className="text-white" size={16} />
          </div>
          <span className="font-black italic tracking-tighter text-xl text-cyan-400">BOTTLE <span className="text-white">MANIA</span></span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* Game Stage */}
      <div className="flex-1 relative flex flex-col items-center justify-between py-12 px-6">
        <div className="text-center z-10">
          <div className="text-green-400 font-black text-4xl sm:text-5xl drop-shadow-[0_0_20px_rgba(74,222,128,0.4)] tracking-tighter italic">
            {multiplier > 0 ? `${multiplier}x` : '50,000x'}
          </div>
          <div className="text-[10px] font-bold text-cyan-400/60 tracking-[0.3em] uppercase mt-1">Multiplicador Máximo</div>
        </div>

        {/* Bottles Container */}
        <div className="flex items-end justify-center gap-4 sm:gap-8 w-full max-w-sm h-64 relative">
          {bottles.map((i) => (
            <div 
              key={i}
              onClick={() => !isPlaying && setSelectedBottle(i)}
              className={`relative cursor-pointer transition-all duration-300 flex flex-col items-center group ${selectedBottle === i ? 'scale-110 -translate-y-4' : 'scale-90 opacity-60'}`}
            >
              {/* Bottle SVG/Visual */}
              <div className={`w-16 sm:w-20 h-40 sm:h-48 rounded-t-3xl rounded-b-xl border-2 transition-all duration-500 flex items-center justify-center bg-white/5 backdrop-blur-md relative overflow-hidden ${selectedBottle === i ? 'border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.3)]' : 'border-white/10'}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20" />
                <div className="w-2 h-12 bg-white/20 rounded-full blur-[1px] absolute top-4 left-4" />
                
                {isRevealing && selectedBottle === i && (
                  <div className="absolute inset-0 bg-cyan-400/20 animate-pulse flex items-center justify-center">
                    <div className="w-4 h-4 bg-white rounded-full animate-ping" />
                  </div>
                )}
                
                {multiplier > 0 && selectedBottle === i && !isRevealing && (
                  <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                    <Trophy className="text-green-400 animate-bounce" size={32} />
                  </div>
                )}
              </div>
              
              <div className={`mt-4 w-2 h-2 rounded-full transition-colors ${selectedBottle === i ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)]' : 'bg-white/20'}`} />
            </div>
          ))}
          
          {/* Floor Shadow */}
          <div className="absolute -bottom-4 w-[120%] h-4 bg-black/40 blur-xl rounded-full" />
        </div>

        <div className="z-10 w-full flex flex-col items-center gap-6">
          {/* Bet Selector */}
          <div className="flex items-center gap-4 p-3 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 w-full">
            <div className="flex-1 flex items-center bg-black/40 rounded-xl border border-white/5 h-12">
              <button onClick={() => !isPlaying && setBetAmount(Math.max(1, betAmount - 1))} className="w-10 h-full flex items-center justify-center text-gray-500 font-bold">-</button>
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
                className="flex-1 bg-transparent text-center font-black text-sm outline-none w-full"
              />
              <button onClick={() => !isPlaying && setBetAmount(betAmount + 1)} className="w-10 h-full flex items-center justify-center text-gray-500 font-bold">+</button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {bets.map(val => (
                <button
                  key={val}
                  onClick={() => !isPlaying && setBetAmount(prev => prev + val)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${betAmount === val ? 'bg-cyan-600 text-white shadow-lg' : 'bg-white/5 text-gray-500 hover:text-gray-300'}`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <button 
            onClick={handleStart}
            disabled={isPlaying}
            className={`w-full max-w-xs py-5 rounded-[2rem] flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.98] ${isPlaying ? 'bg-gray-800 opacity-50' : 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_10px_30px_rgba(8,145,178,0.4)]'}`}
          >
            <MousePointer2 className={`mb-1 ${isPlaying ? '' : 'animate-bounce'}`} size={20} />
            <span className="font-black tracking-widest text-lg uppercase">PRESSIONAR</span>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-6 bg-black/40 backdrop-blur-md border-t border-white/5 flex justify-between items-center relative z-10">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Saldo Atual</span>
          <span className="text-sm font-black text-cyan-400">{balance.toFixed(2)} MT</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Aposta</span>
          <span className="text-sm font-black text-white">{betAmount} MT</span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default BottleManiaGame;
