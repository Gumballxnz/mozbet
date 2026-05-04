import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Menu, MessageCircle, Plane, Users, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { playSound } from "@/lib/sounds";
import { useGameEngine } from "@/hooks/useGameEngine";
import { playSound } from "@/lib/sounds";

interface Props {
  balance: number;
  onUpdateBalance: (b: number) => void;
  onBack: () => void;
}

const historyColor = (m: number) => {
  if (m < 2) return "text-green-400";
  if (m < 10) return "text-yellow-400";
  return "text-orange-500";
};

const EarplaneGame = ({ balance, onUpdateBalance, onBack }: Props) => {
  const [phase, setPhase] = useState<"waiting" | "rising" | "crashed">("waiting");
  
  
  const [history, setHistory] = useState<number[]>([1.45, 2.8, 1.1, 5.2, 1.92, 15.4, 1.23, 3.5]);
  const [bet1, setBet1] = useState(10);
  const [bet2, setBet2] = useState(10);
  const [tab1, setTab1] = useState<"manual" | "auto">("manual");
  const [tab2, setTab2] = useState<"manual" | "auto">("manual");
  const [hasBet1, setHasBet1] = useState(false);
  const [hasBet2, setHasBet2] = useState(false);
  const [cashed1, setCashed1] = useState(false);
  const [cashed2, setCashed2] = useState(false);
  const onlineRef = useRef(212 + Math.floor(Math.random() * 50));
  const online = onlineRef.current;
  
  
  const { phase, multiplier, countdown, roundId: currentRoundIdRef, startedAt, multiplierRef } = useGameEngine("earplane");
  const currentRoundId = { current: currentRoundIdRef };

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/game/history?game=earplane&limit=10");
      const data = await res.json();
      if (data.history) setHistory(data.history.map((h: any) => h.crashPoint));
    } catch (err) {}
  }, []);

  

  useEffect(() => {
    fetchRoundState();
    fetchHistory();
    joinRoom("game_earplane");

    const handleUpdate = (data: any) => {
      if (data.game !== "earplane") return;
      currentRoundId.current = data.round_id;

      if (data.status === "waiting") {
        setPhase("waiting");
        setMultiplier(1.0);
        setHasBet1(false);
        setHasBet2(false);
        setCashed1(false);
        setCashed2(false);
        const startMs = new Date(data.started_at).getTime();
        playSound('notification');
        setCountdown(Math.max(1, Math.ceil((startMs - Date.now()) / 1000)));
      } else if (data.status === "running") {
        setPhase("rising");
        startedAt.current = new Date(data.started_at).getTime();
      } else if (data.status === "crashed") {
        playSound('crash');
        setPhase("crashed");
        setMultiplier(data.crash_point);
        fetchHistory();
      }
    };

    socket.on("game_update", handleUpdate);
    return () => {
      socket.off("game_update", handleUpdate);
      leaveRoom("game_earplane");
    };
  }, [fetchHistory, fetchRoundState]);

  

  const place = async (n: 1 | 2) => {
    const amt = n === 1 ? bet1 : bet2;
    if (phase !== "waiting" || amt <= 0) return;
    if (amt > balance) {
      toast.error("Saldo insuficiente");
      return;
    }

    try {
      const res = await fetch("/api/game/crash/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betAmount: amt, gameId: "earplane" })
      });
      const data = await res.json();
      if (data.success) {
        if (n === 1) setHasBet1(true); else setHasBet2(true);
        onUpdateBalance(data.newBalance);
        toast.success("Aposta aceite!");
      } else {
        toast.error(data.error || "Erro ao apostar");
      }
    } catch (e) {
      toast.error("Erro de conexão");
    }
  };

  const cashOut = async (n: 1 | 2) => {
    if (phase !== "rising") return;
    const amt = n === 1 ? bet1 : bet2;
    const has = n === 1 ? hasBet1 : hasBet2;
    const already = n === 1 ? cashed1 : cashed2;
    if (!has || already) return;
    
    if (n === 1) setCashed1(true); else setCashed2(true);

    try {
      const res = await fetch("/api/game/crash/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betAmount: amt, multiplier: multiplier, gameId: "earplane" })
      });
      const data = await res.json();
      if (data.success) {
        onUpdateBalance(data.newBalance);
        playSound('cashout');
        toast.success(`Ganhou ${(amt * multiplier).toFixed(2)} MZN!`);
      } else {
        toast.error(data.error || "Erro no cashout");
        if (n === 1) setCashed1(false); else setCashed2(false);
      }
    } catch (e) {
      toast.error("Erro na retirada.");
      if (n === 1) setCashed1(false); else setCashed2(false);
    }
  };

  const planeX = phase === "rising" ? Math.min(multiplier * 15, 85) : 10;
  const planeY = phase === "rising" ? Math.max(75 - multiplier * 8, 15) : 75;

  const renderBetPanel = (n: 1 | 2) => {
    const val = n === 1 ? bet1 : bet2;
    const setVal = n === 1 ? setBet1 : setBet2;
    const tab = n === 1 ? tab1 : tab2;
    const setTab = n === 1 ? setTab1 : setTab2;
    const has = n === 1 ? hasBet1 : hasBet2;
    const cashed = n === 1 ? cashed1 : cashed2;
    return (
      <div className="bg-[#2a2a2a] rounded-xl p-2.5 space-y-2">
        <div className="flex bg-[#1a1a1a] rounded-lg p-0.5">
          <button onClick={() => setTab("manual")} className={`flex-1 py-1 text-[10px] font-bold rounded ${tab === "manual" ? "bg-[#007bff] text-white" : "text-gray-400"}`}>Apostar</button>
          <button onClick={() => setTab("auto")} className={`flex-1 py-1 text-[10px] font-bold rounded ${tab === "auto" ? "bg-[#007bff] text-white" : "text-gray-400"}`}>Auto</button>
        </div>
        <div className="flex items-center bg-[#1a1a1a] rounded-lg">
          <button onClick={() => setVal(Math.max(1, val - 1))} disabled={has} className="px-2 py-2 text-white disabled:opacity-40"><Minus size={14} /></button>
          <input 
            type="number" 
            value={val}
            disabled={has}
            onChange={(e) => setVal(Number(e.target.value))}
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (isNaN(v) || v < 1) setVal(1);
            }}
            inputMode="numeric"
            className="flex-1 bg-transparent text-center text-white font-bold text-sm outline-none w-full"
          />
          <button onClick={() => setVal(val + 1)} disabled={has} className="px-2 py-2 text-white disabled:opacity-40"><Plus size={14} /></button>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {[10, 20, 50, 100].map(v => (
            <button key={v} onClick={() => !has && setVal(prev => prev + v)} disabled={has} className="bg-[#1a1a1a] text-gray-300 text-[10px] font-bold py-1 rounded disabled:opacity-40">{v}</button>
          ))}
        </div>
        {phase === "rising" && has && !cashed ? (
          <button onClick={() => cashOut(n)} className="w-full py-2.5 rounded-lg font-extrabold text-xs bg-gradient-to-r from-orange-500 to-orange-600 text-white active:scale-[0.96] shadow-lg">
            RETIRAR {(val * multiplier).toFixed(2)} MZN
          </button>
        ) : (
          <button onClick={() => place(n)} disabled={has || phase !== "waiting"} className={`w-full py-2.5 rounded-lg font-extrabold text-xs ${has || phase !== "waiting" ? "bg-gray-700 text-gray-500" : "bg-gradient-to-r from-[#007bff] to-[#0056d2] text-white active:scale-[0.96] shadow-lg"}`}>
            APOSTAR {val.toFixed(2)} MZN
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col text-white" style={{ background: "linear-gradient(to bottom, #000 0%, #0b1f3a 100%)" }}>
      <div className="flex items-center gap-3 px-3 py-2.5 bg-black/40">
        <button onClick={onBack}><ArrowLeft size={20} /></button>
        <span className="text-xl font-extrabold italic text-[#ff3b3b]">EARPLANE</span>
        <div className="ml-auto flex items-center gap-2">
          <button className="p-1.5 bg-[#1a1a1a] rounded-full"><MessageCircle size={14} /></button>
          <button className="p-1.5 bg-[#1a1a1a] rounded-full"><Menu size={14} /></button>
        </div>
      </div>

      {/* History */}
      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 scrollbar-hide">
        {history.map((m, i) => (
          <span key={i} className={`text-[11px] font-bold px-2.5 py-1 rounded-full bg-black border border-white/10 whitespace-nowrap ${historyColor(m)}`}>
            {m.toFixed(2)}x
          </span>
        ))}
      </div>

      {/* Game area */}
      <div className="relative mx-3 rounded-2xl overflow-hidden h-64" style={{ background: "radial-gradient(ellipse at center, #1a2a4a 0%, #000 70%)" }}>
        {phase === "rising" && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d={`M5,85 Q${planeX / 2},${(85 + planeY) / 2 - 5} ${planeX},${planeY} L${planeX},100 L5,100 Z`} fill="#ff3b3b" opacity="0.2" />
            <path d={`M5,85 Q${planeX / 2},${(85 + planeY) / 2 - 5} ${planeX},${planeY}`} stroke="#ff3b3b" strokeWidth="1" fill="none" />
          </svg>
        )}

        {phase === "rising" && (
          <Plane size={32} className="absolute text-[#ff3b3b] drop-shadow-[0_0_15px_rgba(255,59,59,0.8)] transition-all duration-75" style={{ left: `${planeX}%`, top: `${planeY}%`, transform: "translate(-50%, -50%) rotate(-30deg)" }} />
        )}

        <div className="absolute inset-0 flex items-center justify-center">
          {phase === "waiting" && (
            <div className="text-center">
              <p className="text-gray-400 text-xs mb-1">Próxima em</p>
              <p className="text-5xl font-extrabold font-mono">{countdown}s</p>
            </div>
          )}
          {phase === "rising" && (
            <p className="text-6xl font-extrabold font-mono text-[#00ff88] drop-shadow-[0_0_20px_rgba(0,255,136,0.6)]">
              x{multiplier.toFixed(2)}
            </p>
          )}
          {phase === "crashed" && (
            <div className="text-center animate-scale-in">
              <p className="text-red-400 text-sm font-bold">DESAPARECEU</p>
              <p className="text-5xl font-extrabold font-mono text-red-400">x{multiplier.toFixed(2)}</p>
            </div>
          )}
        </div>

        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-green-600 px-2 py-1 rounded-full text-[10px] font-bold">
          <Users size={10} /> {online}
        </div>
      </div>

      {/* Panels */}
      <div className="grid grid-cols-2 gap-2 px-3 mt-3 pb-4">
        {renderBetPanel(1)}
        {renderBetPanel(2)}
      </div>
    </div>
  );
};

export default EarplaneGame;

