"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, User as UserIcon, HelpCircle, Settings, Menu, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { socket, joinRoom, leaveRoom } from "@/lib/socket";
import { playSound } from "@/lib/sounds";
import { useGameEngine } from "@/hooks/useGameEngine";

interface Props {
  balance: number;
  onUpdateBalance: (b: number) => void;
  onBack: () => void;
}

// Máscara de ID idêntica ao Lobby (MZ + 3 chars + ***)
function maskUserId(username: string): string {
  if (!username) return "USER***";
  const cleanId = username.includes("-") ? username.split("-")[0] : username;
  if (/^\d/.test(cleanId)) {
    return "MZ" + cleanId.slice(0, 3).toUpperCase() + "***";
  }
  return cleanId.slice(0, 4).toUpperCase() + "***";
}

// Componente da Caixa de Aposta Individual (Estilo Spribe)
const BetBox = ({ 
  phase, multiplier, balance, onBet, onCashout, 
  cashedOut, hasBet, lastWin, activeBetAmount 
}: any) => {
  const [betAmount, setBetAmount] = useState(10);
  const presets = [32, 80, 160, 800];
  const [isAuto, setIsAuto] = useState(false);
  
  return (
    <div className="flex-1 bg-[#141516] rounded-3xl border border-[#2A2F40] p-3 flex flex-col gap-3">
      <div className="flex justify-center gap-4">
        <button 
          onClick={() => setIsAuto(false)}
          className={`text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full transition-colors ${!isAuto ? 'bg-[#2A2B2E] text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Aposta
        </button>
        <button 
          onClick={() => setIsAuto(true)}
          className={`text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full transition-colors ${isAuto ? 'bg-[#2A2B2E] text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Automático
        </button>
      </div>
      
      <div className="flex gap-2 h-full min-h-[80px]">
        <div className="flex-[1.5] flex flex-col gap-1.5">
          <div className="flex items-center bg-[#000000] rounded-xl border border-[#2A2F40] h-10 px-1 relative overflow-hidden group">
            <button 
              onClick={() => { playSound('click'); setBetAmount(Math.max(1, betAmount - 1)); }} 
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-[#2A2B2E] hover:text-white transition-all font-black text-lg"
            >−</button>
            <input 
              type="number" 
              value={betAmount} 
              onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))} 
              className="flex-1 w-0 text-center text-white font-black text-base bg-transparent outline-none" 
            />
            <button 
              onClick={() => { playSound('click'); setBetAmount(betAmount + 1); }} 
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-[#2A2B2E] hover:text-white transition-all font-black text-lg"
            >+</button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {presets.map(v => (
              <button 
                key={v} 
                onClick={() => { playSound('click'); setBetAmount(v); }} 
                className="bg-[#000000] border border-[#2A2F40] rounded-lg py-1 text-[11px] font-black text-white/60 hover:bg-[#2A2B2E] hover:text-white transition-colors"
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-[2.5]">
          {!hasBet && !cashedOut && (
            <button 
              onClick={() => { playSound('click'); onBet(betAmount); }}
              disabled={phase !== "waiting"}
              className={`w-full h-full rounded-2xl flex flex-col items-center justify-center border-b-[4px] shadow-lg active:translate-y-0.5 active:border-b-0 transition-all
                ${phase === "waiting" ? 'bg-[#28A745] hover:bg-[#218838] border-[#1E7E34] text-white cursor-pointer' : 'bg-[#1e2330] border-[#131722] text-gray-500 cursor-not-allowed opacity-80'}`}
            >
              <span className="text-xl font-black uppercase tracking-tight leading-none">BET</span>
              {phase === "waiting" && <span className="text-[11px] font-bold opacity-90 mt-1">{betAmount.toFixed(2)} MZN</span>}
            </button>
          )}

          {hasBet && !cashedOut && (
            <button 
              onClick={() => { playSound('click'); onCashout(); }}
              disabled={phase !== "rising"}
              className="w-full h-full rounded-2xl flex flex-col items-center justify-center border-b-[4px] shadow-lg active:translate-y-0.5 active:border-b-0 transition-all bg-[#FF9800] hover:bg-[#F57C00] border-[#E65100] text-white"
            >
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">CASH OUT</span>
              <span className="text-2xl font-black tracking-tight leading-none">{(activeBetAmount * multiplier).toFixed(2)}</span>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-1">MZN</span>
            </button>
          )}

          {cashedOut && (
            <div className="w-full h-full rounded-2xl flex flex-col items-center justify-center bg-[#28A745]/15 border-2 border-[#28A745]/40 animate-in zoom-in duration-300">
              <span className="text-[10px] font-black text-[#28A745] uppercase tracking-widest mb-1">Sacas-te</span>
              <span className="text-2xl font-black text-[#28A745] leading-none">+{lastWin.toFixed(2)}</span>
              <span className="text-[10px] font-black text-[#28A745] uppercase tracking-widest mt-1">MZN</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AviatorGame = ({ balance, onUpdateBalance, onBack }: Props) => {
  const { isLoggedIn, user } = useAppStore();
  const { phase, multiplier, countdown, roundId, startedAt, multiplierRef } = useGameEngine("aviator");
  const [history, setHistory] = useState<number[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'prev' | 'top'>('all');
  
  // Estado das apostas reais
  const [betsState, setBetsState] = useState([
    { hasBet: false, cashedOut: false, lastWin: 0, betAmount: 10 },
    { hasBet: false, cashedOut: false, lastWin: 0, betAmount: 10 }
  ]);

  // Lista da Esquerda (Real + Fake)
  const [roundBets, setRoundBets] = useState<any[]>([]);
  const [topBets, setTopBets] = useState<any[]>([]);
  const [prevBets, setPrevBets] = useState<any[]>([]);

  
  
  // Quando a fase muda, ajustamos os estados das apostas para refletir o ciclo
  useEffect(() => {
    if (phase === "waiting") {
      setBetsState(prev => prev.map(b => ({ ...b, hasBet: false, cashedOut: false })));
      setRoundBets([]);
    } else if (phase === "crashed") {
      setBetsState(prev => prev.map(b => ({
        ...b,
        hasBet: false,
        cashedOut: b.cashedOut // Mantém se sacou, senão perde
      })));
      setTimeout(() => {
        fetchHistory();
        fetchTopBets();
      }, 1000);
    }
  }, [phase]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/game/history?game=aviator&limit=30");
      const data = await res.json();
      if (data.history) {
        setHistory(data.history.map((h: any) => h.crashPoint));
        const lastRound = data.history[0];
        if (lastRound && lastRound.bets) {
            setPrevBets(lastRound.bets.map((b: any) => ({
                user: maskUserId(b.user_id),
                bet: b.amount,
                cashedAt: b.cashed_out_at,
                win: b.win_amount || 0
            })));
        }
      }
    } catch (err) {}
  }, []);

  const fetchTopBets = useCallback(async () => {
    // Disabled to prevent 400 Bad Request if RLS/Columns mismatch.
    setTopBets([]);
  }, []);

  useEffect(() => {
    fetchHistory();
    fetchTopBets();
    
    const channel = supabase.channel(`game_aviator_bets`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bets', filter: `game_id=eq.aviator` }, (payload) => {
        const data = payload.new as any;
        setRoundBets(prev => {
            if (prev.some(b => b.user === maskUserId(data.user_id))) return prev;
            return [{
                user: maskUserId(data.user_id),
                bet: data.amount,
                cashedAt: null,
                win: 0
            }, ...prev].slice(0, 50);
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bets', filter: `game_id=eq.aviator` }, (payload) => {
        const data = payload.new as any;
        if (data.status === 'won') {
          setRoundBets(prev => prev.map(b => {
              if (b.user === maskUserId(data.user_id)) {
                  return { ...b, cashedAt: data.crash_point, win: data.win_amount };
              }
              return b;
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchHistory, fetchTopBets]);

  const handleBet = async (boxIndex: number, amount: number) => {
    if (!isLoggedIn) { toast.error("Faça login para apostar!"); return; }
    if (phase !== "waiting") { toast.error("Aguarde a próxima ronda."); return; }
    if (amount > balance) { 
      playSound('notification');
      toast.error("Saldo insuficiente!"); 
      return; 
    }
    
    try {
      const res = await fetch("/api/game/crash/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betAmount: amount, gameId: "aviator" })
      });
      const data = await res.json();
      if (data.success) {
        setBetsState(prev => {
          const next = [...prev];
          next[boxIndex] = { ...next[boxIndex], hasBet: true, betAmount: amount };
          return next;
        });
        onUpdateBalance(data.newBalance);
        toast.success("Aposta aceite!");
      } else {
        toast.error(data.error || "Erro ao apostar");
      }
    } catch (err) {
      toast.error("Erro de conexão");
    }
  };

  const handleCashout = async (boxIndex: number) => {
    if (phase !== "rising" ) return;
    const box = betsState[boxIndex];
    if (!box.hasBet || box.cashedOut) return;
    
    try {
      const res = await fetch("/api/game/crash/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          betAmount: box.betAmount, 
          multiplier: multiplier, 
          gameId: "aviator" 
        })
      });
      const data = await res.json();
      if (data.success) {
        setBetsState(prev => {
          const next = [...prev];
          next[boxIndex] = { ...next[boxIndex], cashedOut: true, lastWin: data.winAmount };
          return next;
        });
        playSound('cashout');
        onUpdateBalance(data.newBalance);
      } else {
        toast.error(data.error || "Erro no cashout");
      }
    } catch (err) {
      toast.error("Erro na retirada");
    }
  };

  const renderBetsList = () => {
      const list = activeTab === 'all' ? roundBets : (activeTab === 'prev' ? prevBets : topBets);
      
      return (
        <div className="flex-1 overflow-y-auto bg-[#000000] no-scrollbar">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2 text-[10px] uppercase font-black text-white/30 sticky top-0 bg-[#000000]/95 backdrop-blur z-10">
            <span>Jogador</span>
            <span className="w-20 text-center">BET</span>
            <span className="w-24 text-right">Ganho</span>
          </div>
          <div className="flex flex-col">
            {list.length === 0 && (
                <div className="py-20 text-center text-[10px] font-bold text-white/10 uppercase tracking-widest">Sem Apostas</div>
            )}
            {list.map((f, i) => (
              <div key={i} className={`grid grid-cols-[1fr_auto_auto] gap-4 items-center px-4 py-2 border-b border-white/[0.02] ${f.cashedAt ? 'bg-[#28A745]/5' : ''}`}>
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 ${f.cashedAt ? 'bg-[#28A745]/10 border-[#28A745]/20' : 'bg-white/5 border-white/5'}`}>
                    <UserIcon size={12} className={f.cashedAt ? 'text-[#28A745]' : 'text-gray-600'} />
                  </div>
                  <span className={`text-[11px] font-black truncate ${f.cashedAt ? 'text-white' : 'text-white/60'}`}>{f.user}</span>
                </div>
                <div className="w-20 text-center font-mono-data text-[11px] font-bold text-white/80">{Number(f.bet).toFixed(2)}</div>
                <div className="w-24 flex justify-end gap-2 items-center">
                  {f.cashedAt && <span className="bg-[#28A745]/15 text-[#28A745] px-1.5 py-0.5 rounded text-[9px] font-black">{f.cashedAt.toFixed(2)}x</span>}
                  <span className={`text-[11px] font-black ${f.win > 0 ? "text-[#28A745]" : "text-white/20"}`}>{f.win > 0 ? f.win.toFixed(2) : "-"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col lg:flex-row bg-[#000000] font-sans text-white overflow-hidden">
      {/* HEADER MOBILE */}
      <div className="lg:hidden h-14 bg-[#141516] flex items-center justify-between px-4 shrink-0 shadow-lg z-30 border-b border-white/5">
        <button onClick={onBack} className="text-gray-400 hover:text-white p-2 -ml-2"><ArrowLeft size={20} /></button>
        <span className="text-red-500 font-black italic text-xl tracking-tighter">Aviator</span>
        <div className="flex gap-4 items-center">
            <span className="text-primary font-black text-sm">{balance.toFixed(2)} MZN</span>
            <Menu className="text-gray-400" size={20} />
        </div>
      </div>

      {/* PAINEL ESQUERDO (Apostas Ronda) */}
      <div className="flex flex-col h-[40%] lg:h-full lg:w-[320px] bg-[#14161E] border-r border-[#2A2F40] shrink-0 z-20">
        <div className="hidden lg:flex h-14 items-center gap-3 px-4 bg-[#141516] border-b border-[#2A2F40]">
           <button onClick={onBack} className="text-gray-400 hover:text-white"><ArrowLeft size={20} /></button>
           <span className="text-red-500 font-black italic text-xl tracking-tighter">Aviator</span>
        </div>
        
        <div className="flex bg-[#000000] p-2 gap-1">
          <button onClick={() => setActiveTab('all')} className={`flex-1 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'all' ? 'bg-[#2A2B2E] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Tudo</button>
          <button onClick={() => setActiveTab('prev')} className={`flex-1 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'prev' ? 'bg-[#2A2B2E] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Anterior</button>
          <button onClick={() => setActiveTab('top')} className={`flex-1 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'top' ? 'bg-[#2A2B2E] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Topo</button>
        </div>

        {activeTab === 'all' && (
            <div className="px-4 py-2 bg-[#141516]/50 border-b border-black flex justify-between items-center">
                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{roundBets.length} Apostas</span>
                <div className="h-1 w-20 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#28A745] transition-all duration-1000" style={{ width: `${Math.min(100, (roundBets.length / 50) * 100)}%` }} />
                </div>
            </div>
        )}

        {renderBetsList()}

        <div className="p-3 bg-[#141516] border-t border-white/5 flex justify-between items-center text-[9px] font-bold text-gray-500 uppercase tracking-widest">
            <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span>Provably Fair</span>
            </div>
            <span>Powered by MOZBET</span>
        </div>
      </div>

      {/* ÁREA CENTRAL */}
      <div className="flex-1 flex flex-col bg-[#000000] relative">
        
        {/* HEADER DESKTOP */}
        <div className="hidden lg:flex h-14 bg-[#141516] justify-end items-center px-6 border-b border-[#2A2F40] gap-4">
            <div className="flex items-center gap-2 bg-[#000000] px-4 py-1.5 rounded-full border border-white/5">
                <span className="text-primary font-black text-sm tracking-tight">{balance.toFixed(2)} MZN</span>
            </div>
            <button className="text-gray-400 hover:text-white"><HelpCircle size={20} /></button>
            <button className="text-gray-400 hover:text-white"><Settings size={20} /></button>
            <button className="text-gray-400 hover:text-white"><Menu size={20} /></button>
        </div>

        {/* HISTÓRICO NO TOPO (Estilo Spribe) */}
        <div className="h-8 flex items-center px-4 bg-[#14161E] border-b border-[#2A2F40] shrink-0 overflow-x-auto no-scrollbar relative">
          <div className="flex gap-1.5 min-w-max">
            {history.map((m, i) => {
               let col = "text-[#913EF8] border-[#913EF8]/20 bg-[#913EF8]/5"; 
               if (m < 2.0) col = "text-[#3498DB] border-[#3498DB]/20 bg-[#3498DB]/5"; 
               if (m >= 10.0) col = "text-[#C017B4] border-[#C017B4]/20 bg-[#C017B4]/5"; 
               
               return (
                 <span key={i} className={`text-[10px] font-black px-2 py-0.5 rounded-full border cursor-pointer hover:bg-white/5 transition-colors ${col}`}>
                   {m.toFixed(2)}x
                 </span>
               )
            })}
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#14161E] to-transparent pointer-events-none" />
        </div>

        {/* TELA CENTRAL DO JOGO */}
        <div className="flex-1 flex flex-col p-2 lg:p-6 gap-2 lg:gap-6 overflow-hidden">
          
          <div className="flex-1 relative bg-[#000000] rounded-[2.5rem] overflow-hidden border border-[#2A2F40] shadow-2xl flex items-center justify-center">
            
            {/* EFEITO DE FUNDO DINÂMICO */}
            <div className="absolute inset-0 opacity-40 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(229,57,53,0.1),transparent_70%)]" />
                <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_50%_50%,rgba(52,152,219,0.05),transparent_80%)]" />
            </div>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none p-4">
              {phase === "loading" && (
                <div className="w-16 h-16 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin" />
              )}

              {phase === "waiting" && (
                <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-red-600/10 rounded-full flex items-center justify-center border border-red-600/20 mb-2">
                     <div className="w-10 h-10 animate-bounce"><svg width="1em" height="1em" viewBox="0 0 512 512" className="fill-red-600 w-full h-full drop-shadow-[0_5px_15px_rgba(229,57,53,0.8)]"><path d="M492.3 227.1L277.5 131.6l-50.6-96c-4.4-8.3-12.8-13.6-22.1-13.6-11.8 0-21.3 9.6-21.3 21.3 0 2.8 1.1 5.5 3.2 7.5L257.6 127 124.9 67.5c-4.3-1.9-9.1-2.4-13.7-1.3L42.5 83c-9.6 2.4-16.1 11.2-16.1 21.1 0 7.8 4.2 14.8 11.2 18L130 166.4l-48.8 49-65.7-10.4c-3.1-.5-6.3.1-8.9 1.7-4.8 2.9-7.1 8.6-5.5 13.9l19.5 64.9c2 6.7 8.1 11.3 15.1 11.3 1 0 2-.1 3-.3l189.6-39.6c4.6-1 9.4-.6 13.8 1l185.3 69.1c11.3 4.2 23.9-1.5 28.1-12.8 2.6-6.9 1.5-14.7-2.9-20.5-5.9-7.9-14.9-12.3-24.6-12.3z"/></svg></div>
                  </div>
                  <div className="text-white text-lg lg:text-xl font-black uppercase tracking-widest text-shadow-lg">WAITING FOR NEXT ROUND</div>
                  <div className="text-gray-400 font-black text-2xl lg:text-4xl mt-2 flex items-baseline gap-1">
                     <span className="animate-pulse">00:{countdown < 10 ? `0${countdown}` : countdown}</span>
                  </div>
                  <div className="w-64 h-2 bg-white/5 rounded-full mt-4 p-0.5 border border-white/5 overflow-hidden">
                     <div className="h-full bg-red-600 rounded-full transition-all duration-1000 ease-linear shadow-[0_0_15px_rgba(229,57,53,0.5)]" style={{ width: `${(countdown/5)*100}%` }} />
                  </div>
                </div>
              )}

              {phase === "rising" && (
                <div className="flex flex-col items-center justify-center relative w-full h-full">
                  <span className="font-black text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] z-20" style={{ fontSize: "clamp(70px, 15vw, 160px)", lineHeight: 1 }}>
                    {multiplier.toFixed(2)}x
                  </span>
                  
                  {/* ANIMAÇÃO DO AVIÃO E CURVA */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden p-10 lg:p-20">
                     <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                        <path d={`M 5 95 Q 40 95 90 ${Math.max(10, 95 - (multiplier - 1) * 20)}`} fill="transparent" stroke="#E53935" strokeWidth="3.5" strokeLinecap="round" className="drop-shadow-[0_0_10px_rgba(229,57,53,0.8)]" />
                        <path d={`M 5 95 Q 40 95 90 ${Math.max(10, 95 - (multiplier - 1) * 20)} L 90 95 Z`} fill="url(#grad)" />
                        <defs>
                          <linearGradient id="grad" x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stopColor="rgba(229, 57, 53, 0)" />
                            <stop offset="100%" stopColor="rgba(229, 57, 53, 0.4)" />
                          </linearGradient>
                        </defs>
                     </svg>
                     <div 
                        className="absolute w-20 h-20 text-5xl flex items-center justify-center drop-shadow-2xl transition-all duration-300 ease-out" 
                        style={{ 
                            left: '85%', 
                            top: `${Math.max(5, 85 - (multiplier - 1) * 20)}%`, 
                            transform: `translate(-50%, -50%) rotate(${-20 - (multiplier-1)*2}deg)` 
                        }}
                     >
                        <div className="w-16 h-16 animate-pulse"><svg width="1em" height="1em" viewBox="0 0 512 512" className="fill-red-600 w-full h-full drop-shadow-[0_5px_15px_rgba(229,57,53,0.8)]"><path d="M492.3 227.1L277.5 131.6l-50.6-96c-4.4-8.3-12.8-13.6-22.1-13.6-11.8 0-21.3 9.6-21.3 21.3 0 2.8 1.1 5.5 3.2 7.5L257.6 127 124.9 67.5c-4.3-1.9-9.1-2.4-13.7-1.3L42.5 83c-9.6 2.4-16.1 11.2-16.1 21.1 0 7.8 4.2 14.8 11.2 18L130 166.4l-48.8 49-65.7-10.4c-3.1-.5-6.3.1-8.9 1.7-4.8 2.9-7.1 8.6-5.5 13.9l19.5 64.9c2 6.7 8.1 11.3 15.1 11.3 1 0 2-.1 3-.3l189.6-39.6c4.6-1 9.4-.6 13.8 1l185.3 69.1c11.3 4.2 23.9-1.5 28.1-12.8 2.6-6.9 1.5-14.7-2.9-20.5-5.9-7.9-14.9-12.3-24.6-12.3z"/></svg></div>
                        <div className="absolute inset-0 bg-red-600/20 blur-2xl rounded-full -z-10 animate-pulse" />
                     </div>
                  </div>
                </div>
              )}

              {phase === "crashed" && (
                <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-[#E53935] text-white font-black text-xl lg:text-3xl uppercase tracking-tighter px-10 py-3 rounded-2xl shadow-2xl rotate-[-2deg]">
                    FUGIU PARA LONGE!
                  </div>
                  <span className="font-black text-[#E53935] drop-shadow-[0_5px_15px_rgba(229,57,53,0.4)]" style={{ fontSize: "clamp(60px, 12vw, 110px)", lineHeight: 1 }}>
                    {multiplier.toFixed(2)}x
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* PAINEIS DE APOSTAS (Responsividade PC) */}
          <div className="flex flex-col md:flex-row gap-3 lg:gap-6 shrink-0 h-auto md:h-[160px]">
             <BetBox 
               phase={phase} multiplier={multiplier} balance={balance} 
               onBet={(amt: number) => handleBet(0, amt)} onCashout={() => handleCashout(0)} 
               {...betsState[0]} activeBetAmount={betsState[0].betAmount} 
             />
             <BetBox 
               phase={phase} multiplier={multiplier} balance={balance} 
               onBet={(amt: number) => handleBet(1, amt)} onCashout={() => handleCashout(1)} 
               {...betsState[1]} activeBetAmount={betsState[1].betAmount} 
             />
          </div>
        </div>

        
      </div>
    </div>
  );
};

export default AviatorGame;
