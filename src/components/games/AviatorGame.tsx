"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, User as UserIcon, HelpCircle, Settings, Menu, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { socket, joinRoom, leaveRoom } from "@/lib/socket";
import { playSound } from "@/lib/sounds";

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
    <div className="flex-1 bg-[#1A1D27] rounded-3xl border border-[#2A2F40] p-3 flex flex-col gap-3">
      <div className="flex justify-center gap-4">
        <button 
          onClick={() => setIsAuto(false)}
          className={`text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full transition-colors ${!isAuto ? 'bg-[#2C3144] text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Aposta
        </button>
        <button 
          onClick={() => setIsAuto(true)}
          className={`text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full transition-colors ${isAuto ? 'bg-[#2C3144] text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Automático
        </button>
      </div>
      
      <div className="flex gap-2 h-full min-h-[80px]">
        <div className="flex-[1.5] flex flex-col gap-1.5">
          <div className="flex items-center bg-[#101116] rounded-xl border border-[#2A2F40] h-10 px-1 relative overflow-hidden group">
            <button 
              onClick={() => { playSound('click'); setBetAmount(Math.max(1, betAmount - 1)); }} 
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-[#2C3144] hover:text-white transition-all font-black text-lg"
            >−</button>
            <input 
              type="number" 
              value={betAmount} 
              onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))} 
              className="flex-1 w-0 text-center text-white font-black text-base bg-transparent outline-none" 
            />
            <button 
              onClick={() => { playSound('click'); setBetAmount(betAmount + 1); }} 
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-[#2C3144] hover:text-white transition-all font-black text-lg"
            >+</button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {presets.map(v => (
              <button 
                key={v} 
                onClick={() => { playSound('click'); setBetAmount(v); }} 
                className="bg-[#101116] border border-[#2A2F40] rounded-lg py-1 text-[11px] font-black text-white/60 hover:bg-[#2C3144] hover:text-white transition-colors"
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
              <span className="text-xl font-black uppercase tracking-tight leading-none">Aposta</span>
              {phase === "waiting" && <span className="text-[11px] font-bold opacity-90 mt-1">{betAmount.toFixed(2)} MZN</span>}
            </button>
          )}

          {hasBet && !cashedOut && (
            <button 
              onClick={() => { playSound('click'); onCashout(); }}
              disabled={phase !== "rising"}
              className="w-full h-full rounded-2xl flex flex-col items-center justify-center border-b-[4px] shadow-lg active:translate-y-0.5 active:border-b-0 transition-all bg-[#D35400] hover:bg-[#E67E22] border-[#A04000] text-white"
            >
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Cancelar</span>
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
  const [phase, setPhase] = useState<"waiting" | "rising" | "crashed" | "loading">("loading");
  const [multiplier, setMultiplier] = useState(1.0);
  const [countdown, setCountdown] = useState(5);
  const [history, setHistory] = useState<number[]>([]);
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

  const currentRoundId = useRef<string | null>(null);
  const startedAt = useRef<number>(0);
  const animationRef = useRef<number>(0);
  const isCrashedRef = useRef<boolean>(false);
  
  const fetchRoundState = useCallback(async () => {
    try {
      const res = await fetch("/api/game/round?game=aviator");
      const data = await res.json();
      if (!data.round) return;
      currentRoundId.current = data.round.id;
      const startMs = new Date(data.round.startedAt).getTime();
      const now = Date.now();
      
      startedAt.current = startMs;

      if (data.round.status === "waiting") {
        setPhase("waiting");
        isCrashedRef.current = false;
        setMultiplier(1.0);
        setBetsState(prev => prev.map(b => ({ ...b, hasBet: false, cashedOut: false })));
        setCountdown(Math.max(1, Math.ceil((startMs - now) / 1000)));
      } else if (data.round.status === "crashed") {
        setPhase("crashed");
        isCrashedRef.current = true;
        setMultiplier(data.round.crashPoint || 1.0);
      } else {
        setPhase("rising");
        isCrashedRef.current = false;
      }
    } catch (err) {}
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/game/history?game=aviator&limit=30");
      const data = await res.json();
      if (data.history) {
        setHistory(data.history.map((h: any) => h.crashPoint));
        // Popular a aba "Anterior" com a última rodada
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
    try {
        const { data } = await supabase
            .from('game_history')
            .select('*')
            .eq('game_id', 'aviator')
            .order('win_amount', { ascending: false })
            .limit(20);
        
        if (data) {
            setTopBets(data.map(b => ({
                user: maskUserId(b.user_id),
                bet: b.bet_amount,
                cashedAt: b.crash_point,
                win: b.win_amount || 0,
                date: b.created_at
            })));
        }
    } catch (err) {}
  }, []);

  useEffect(() => {
    fetchRoundState();
    fetchHistory();
    fetchTopBets();
    
    joinRoom("game_aviator");

    const handleUpdate = (data: any) => {
      if (data.game !== "aviator") return;
      currentRoundId.current = data.round_id;

      if (data.status === "waiting") {
        setPhase("waiting");
        isCrashedRef.current = false;
        setMultiplier(1.0);
        setBetsState(prev => prev.map(b => ({ ...b, hasBet: false, cashedOut: false })));
        const startMs = new Date(data.started_at).getTime();
        setCountdown(Math.max(1, Math.ceil((startMs - Date.now()) / 1000)));
        setRoundBets([]);
      } else if (data.status === "running") {
        setPhase("rising");
        isCrashedRef.current = false;
        startedAt.current = new Date(data.started_at).getTime();
      } else if (data.status === "crashed") {
        isCrashedRef.current = true;
        setPhase("crashed");
        playSound('crash');
        const crashP = Number(data.crash_point);
        setMultiplier(crashP);
        
        setTimeout(() => {
            fetchHistory();
            fetchTopBets();
        }, 1000);
        
        setBetsState(prev => prev.map(b => ({
          ...b, 
          hasBet: b.hasBet && !b.cashedOut ? false : b.hasBet
        })));
      }
    };

    const handleNewBet = (data: any) => {
        if (data.game !== "aviator") return;
        setRoundBets(prev => {
            if (prev.some(b => b.user === maskUserId(data.user_id))) return prev;
            return [{
                user: maskUserId(data.user_id),
                bet: data.amount,
                cashedAt: null,
                win: 0
            }, ...prev].slice(0, 50);
        });
    };

    const handleCashoutSync = (data: any) => {
        if (data.game !== "aviator") return;
        setRoundBets(prev => prev.map(b => {
            if (b.user === maskUserId(data.user_id)) {
                return { ...b, cashedAt: data.multiplier, win: data.win_amount };
            }
            return b;
        }));
    };

    socket.on("game_update", handleUpdate);
    socket.on("game_bet", handleNewBet);
    socket.on("game_cashout", handleCashoutSync);

    return () => {
      socket.off("game_update", handleUpdate);
      socket.off("game_bet", handleNewBet);
      socket.off("game_cashout", handleCashoutSync);
      leaveRoom("game_aviator");
    };
  }, [fetchRoundState, fetchHistory, fetchTopBets]);

  // Loop do Multiplicador (COM TRAVA DE SEGURANÇA)
  useEffect(() => {
    if (phase === "waiting") {
      const timer = setInterval(() => setCountdown((c) => (c <= 1 ? 0 : c - 1)), 1000);
      return () => clearInterval(timer);
    }
    if (phase === "rising") {
      const updateMultiplier = () => {
        if (isCrashedRef.current) {
            cancelAnimationFrame(animationRef.current);
            return;
        }

        let elapsedMs = Date.now() - startedAt.current;
        if (elapsedMs < 0) elapsedMs = 0;

        if (elapsedMs > 0) {
          const calcMult = Math.min(Math.max(1.0, 1.0 * Math.exp(0.00006 * elapsedMs)), 50000);
          setMultiplier(parseFloat(calcMult.toFixed(2)));
        }
        animationRef.current = requestAnimationFrame(updateMultiplier);
      };
      animationRef.current = requestAnimationFrame(updateMultiplier);
      return () => cancelAnimationFrame(animationRef.current);
    }
  }, [phase]);

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
    if (phase !== "rising" || isCrashedRef.current) return;
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
        <div className="flex-1 overflow-y-auto bg-[#101116] no-scrollbar">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2 text-[10px] uppercase font-black text-white/30 sticky top-0 bg-[#101116]/95 backdrop-blur z-10">
            <span>Jogador</span>
            <span className="w-20 text-center">Aposta</span>
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
    <div className="fixed inset-0 z-50 flex flex-col lg:flex-row bg-[#101116] font-sans text-white overflow-hidden">
      {/* HEADER MOBILE */}
      <div className="lg:hidden h-14 bg-[#1A1D27] flex items-center justify-between px-4 shrink-0 shadow-lg z-30 border-b border-white/5">
        <button onClick={onBack} className="text-gray-400 hover:text-white p-2 -ml-2"><ArrowLeft size={20} /></button>
        <span className="text-red-500 font-black italic text-xl tracking-tighter">Aviator</span>
        <div className="flex gap-4 items-center">
            <span className="text-primary font-black text-sm">{balance.toFixed(2)} MZN</span>
            <Menu className="text-gray-400" size={20} />
        </div>
      </div>

      {/* PAINEL ESQUERDO (Apostas Ronda) */}
      <div className="flex flex-col h-[40%] lg:h-full lg:w-[320px] bg-[#14161E] border-r border-[#2A2F40] shrink-0 z-20">
        <div className="hidden lg:flex h-14 items-center gap-3 px-4 bg-[#1A1D27] border-b border-[#2A2F40]">
           <button onClick={onBack} className="text-gray-400 hover:text-white"><ArrowLeft size={20} /></button>
           <span className="text-red-500 font-black italic text-xl tracking-tighter">Aviator</span>
        </div>
        
        <div className="flex bg-[#101116] p-2 gap-1">
          <button onClick={() => setActiveTab('all')} className={`flex-1 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'all' ? 'bg-[#2C3144] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Tudo</button>
          <button onClick={() => setActiveTab('prev')} className={`flex-1 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'prev' ? 'bg-[#2C3144] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Anterior</button>
          <button onClick={() => setActiveTab('top')} className={`flex-1 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'top' ? 'bg-[#2C3144] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Topo</button>
        </div>

        {activeTab === 'all' && (
            <div className="px-4 py-2 bg-[#1A1D27]/50 border-b border-black flex justify-between items-center">
                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{roundBets.length} Apostas</span>
                <div className="h-1 w-20 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#28A745] transition-all duration-1000" style={{ width: `${Math.min(100, (roundBets.length / 50) * 100)}%` }} />
                </div>
            </div>
        )}

        {renderBetsList()}

        <div className="p-3 bg-[#1A1D27] border-t border-white/5 flex justify-between items-center text-[9px] font-bold text-gray-500 uppercase tracking-widest">
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
        <div className="hidden lg:flex h-14 bg-[#1A1D27] justify-end items-center px-6 border-b border-[#2A2F40] gap-4">
            <div className="flex items-center gap-2 bg-[#101116] px-4 py-1.5 rounded-full border border-white/5">
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
          
          <div className="flex-1 relative bg-[#101116] rounded-[2.5rem] overflow-hidden border border-[#2A2F40] shadow-2xl flex items-center justify-center">
            
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
                     <span className="text-4xl animate-bounce">✈️</span>
                  </div>
                  <div className="text-white text-lg lg:text-xl font-black uppercase tracking-widest text-shadow-lg">A aguardar nova ronda</div>
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
                    {multiplier.toFixed(2)}<span className="text-[0.6em] ml-1">x</span>
                  </span>
                  
                  {/* ANIMAÇÃO DO AVIÃO E CURVA */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden p-10 lg:p-20">
                     <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                        <path d={`M 5 95 Q 40 95 90 ${Math.max(10, 95 - (multiplier - 1) * 20)}`} fill="transparent" stroke="#E53935" strokeWidth="2.5" strokeLinecap="round" className="drop-shadow-[0_0_10px_rgba(229,57,53,0.8)]" />
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
                        <span className="animate-pulse">✈️</span>
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

        {/* CHAT OVERLAY (Floating Button) */}
        <button className="fixed bottom-6 right-6 w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-40 lg:hidden">
            <MessageSquare className="text-white" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-red-600 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-red-600">3</span>
        </button>
      </div>
    </div>
  );
};

export default AviatorGame;
