"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Diamond, Bomb, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { playSound } from "@/lib/sounds";

interface MinesGameProps {
  onClose: () => void;
  balance: number;
  onBet: (amount: number) => void;
}

const MinesGame = ({ onClose, balance, onBet }: MinesGameProps) => {
  const { isLoggedIn, updateBalance } = useAppStore();
  const [betAmount, setBetAmount] = useState(10);
  const [mineCount, setMineCount] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [grid, setGrid] = useState<any[]>(Array(25).fill({ status: "hidden" }));
  const [revealedCount, setRevealedCount] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [nextMultiplier, setNextMultiplier] = useState(1.18);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [potentialWin, setPotentialWin] = useState(0);

  // Calcular multiplicador local (para exibição antes do jogo começar)
  const calculateMultiplier = (mines: number, revealed: number) => {
    let mult = 1.0;
    for (let i = 0; i <= revealed; i++) {
      mult *= (25 - i) / (25 - mines - i);
    }
    return Number(mult.toFixed(2));
  };

  // Atualizar prévia do multiplicador quando mudar nº de minas
  useEffect(() => {
    if (!isPlaying) {
      setNextMultiplier(calculateMultiplier(mineCount, 0));
    }
  }, [mineCount, isPlaying]);

  // ==========================================
  // INICIAR JOGO (chamada ao servidor)
  // ==========================================
  const handleStart = async () => {
    if (!isLoggedIn) {
      toast.error("Faça login para jogar com dinheiro real!");
      return;
    }

    if (balance < betAmount) {
      toast.error("Saldo insuficiente para realizar esta aposta.");
      return;
    }
    if (betAmount <= 0) {
      toast.error("O valor da aposta deve ser maior que zero.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/game/mines/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betAmount, mineCount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Sucesso! Jogo iniciado no servidor
      setSessionId(data.sessionId);
      setIsPlaying(true);
      setRevealedCount(0);
      setCurrentMultiplier(1.0);
      setNextMultiplier(calculateMultiplier(mineCount, 0));
      setPotentialWin(0);
      setGrid(Array(25).fill({ status: "hidden" }));

      // Atualizar saldo no store
      updateBalance(data.newBalance);
      toast.success("Jogo iniciado!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar jogo");
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // REVELAR CÉLULA (chamada ao servidor)
  // ==========================================
  const handleCellClick = async (index: number) => {
    if (!isPlaying || grid[index].status !== "hidden" || isLoading || !sessionId) return;
    playSound('click');
    setIsLoading(true);

    try {
      const res = await fetch("/api/game/mines/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, cellIndex: index }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.result === "mine") {
        // ACERTOU MINA! Revelar todas as minas
        const newGrid = [...grid];
        newGrid[index] = { status: "mine" };
        // Mostrar todas as outras minas
        (data.minePositions as number[]).forEach((pos: number) => {
          if (pos !== index) newGrid[pos] = { status: "mine" };
        });
        setGrid(newGrid);
        setIsPlaying(false);
        setSessionId(null);
        playSound('crash');
        toast.error("💣 BOMBA! Que azar, você perdeu esta rodada.");
      } else if (data.result === "safe") {
        // SEGURO!
        const newGrid = [...grid];
        newGrid[index] = { status: "safe" };
        setGrid(newGrid);
        setRevealedCount(data.revealedCount);
        setCurrentMultiplier(data.currentMultiplier);
        setNextMultiplier(data.nextMultiplier);
        setPotentialWin(data.potentialWin);
        playSound('notification');
        toast.success(`💎 Seguro! ${data.currentMultiplier}x`);
      } else if (data.result === "all_clear") {
        // REVELOU TUDO! Vitória total
        const newGrid = [...grid];
        newGrid[index] = { status: "safe" };
        (data.minePositions as number[]).forEach((pos: number) => {
          newGrid[pos] = { status: "mine" };
        });
        setGrid(newGrid);
        setIsPlaying(false);
        setSessionId(null);
        updateBalance(data.newBalance);
        toast.success(`🏆 INCRÍVEL! Revelou tudo! +${data.winnings.toFixed(2)} MT`);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao revelar célula");
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // CASHOUT (chamada ao servidor)
  // ==========================================
  const handleCashout = async () => {
    if (!isPlaying || revealedCount === 0 || isLoading || !sessionId) return;

    setIsLoading(true);

    try {
      const res = await fetch("/api/game/mines/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Revelar minas após o saque
      const newGrid = [...grid];
      (data.minePositions as number[]).forEach((pos: number) => {
        if (newGrid[pos].status === "hidden") {
          newGrid[pos] = { status: "mine" };
        }
      });
      setGrid(newGrid);

      setIsPlaying(false);
      setSessionId(null);
      updateBalance(data.newBalance);
      playSound('cashout');
      toast.success(`🎉 Sacou ${data.winnings.toFixed(2)} MT com ${data.multiplier}x!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao sacar");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-[#0b0f1a] flex flex-col font-sans text-white overflow-hidden animate-in fade-in duration-300">
      {/* Background */}
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
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Conteúdo do Jogo */}
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center py-6 px-4">
        {/* Multiplicador Card */}
        <div className="w-full max-w-sm mb-6 relative">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4 text-center">
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
              {isPlaying ? "Multiplicador Actual" : "Próximo Multiplicador"}
            </div>
            <div className="text-4xl font-black text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.4)] tracking-tighter italic">
              {isPlaying ? `${currentMultiplier.toFixed(2)}x` : `${nextMultiplier.toFixed(2)}x`}
            </div>
            {isPlaying && potentialWin > 0 && (
              <div className="text-sm font-bold text-emerald-400 mt-1">
                Ganho potencial: {potentialWin.toFixed(2)} MT
              </div>
            )}
          </div>
        </div>

        {/* Grid do Mines */}
        <div className="grid grid-cols-5 gap-2 w-full max-w-sm aspect-square p-2 bg-black/20 rounded-2xl border border-white/5">
          {grid.map((cell, i) => (
            <button
              key={i}
              onClick={() => handleCellClick(i)}
              disabled={!isPlaying || cell.status !== "hidden" || isLoading}
              className={`relative rounded-xl transition-all duration-300 transform active:scale-90 flex items-center justify-center overflow-hidden
                ${cell.status === "hidden" ? "bg-white/10 hover:bg-white/15 border-b-4 border-black/40 shadow-lg" : ""}
                ${cell.status === "safe" ? "bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.5)] border-blue-400" : ""}
                ${cell.status === "mine" ? "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] border-red-400" : ""}
                ${isLoading && cell.status === "hidden" ? "opacity-50" : ""}
              `}
            >
              {cell.status === "hidden" && <div className="w-1.5 h-1.5 bg-white/20 rounded-full" />}
              {cell.status === "safe" && <Diamond className="text-white fill-current animate-in zoom-in" size={20} />}
              {cell.status === "mine" && <Bomb className="text-white fill-current animate-bounce" size={20} />}
            </button>
          ))}
        </div>

        {/* Estatísticas */}
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

      {/* Painel de Apostas */}
      <div className="bg-[#0f0f0f] w-full border-t border-white/5 relative z-30 shadow-[0_-20px_60px_rgba(0,0,0,0.8)] md:rounded-t-[3rem]">
        <div className="max-w-md mx-auto p-5 pb-10">
          <div className="flex gap-4 mb-4 border-b border-white/5">
            <button className="pb-3 border-b-2 border-blue-500 text-blue-400 font-black tracking-wider text-[10px] px-2 uppercase">
              Aposta
            </button>
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-2">
              {[1, 5, 10, 50].map((v) => (
                <button
                  key={v}
                  onClick={() => !isPlaying && setBetAmount((prev) => prev + v)}
                  disabled={isPlaying}
                  className="bg-black/40 border border-white/5 px-4 py-2 rounded-xl text-[10px] font-black text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40"
                >
                  +{v}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest pl-1">
                  Valor da Aposta
                </span>
                <div className="bg-black/40 rounded-xl p-1 flex items-center border border-white/5 h-12">
                  <button
                    onClick={() => !isPlaying && setBetAmount(Math.max(1, betAmount - 1))}
                    className="w-10 h-full flex items-center justify-center text-gray-500 hover:text-white"
                  >
                    -
                  </button>
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
                  <button
                    onClick={() => !isPlaying && setBetAmount(betAmount + 1)}
                    className="w-10 h-full flex items-center justify-center text-gray-500 hover:text-white"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest pl-1">
                  Minas
                </span>
                <div className="bg-black/40 rounded-xl p-1 flex items-center border border-white/5 h-12">
                  <button
                    onClick={() => !isPlaying && setMineCount(Math.max(1, mineCount - 1))}
                    className="w-10 h-full flex items-center justify-center text-gray-500 hover:text-white"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={mineCount}
                    disabled={isPlaying}
                    onChange={(e) => setMineCount(Number(e.target.value))}
                    onBlur={(e) => {
                      const val = Number(e.target.value);
                      if (isNaN(val) || val < 1) setMineCount(1);
                      else if (val > 24) setMineCount(24);
                    }}
                    inputMode="numeric"
                    className="flex-1 bg-transparent text-center font-black text-sm italic outline-none w-full text-blue-400"
                  />
                  <button
                    onClick={() => !isPlaying && setMineCount(Math.min(24, mineCount + 1))}
                    className="w-10 h-full flex items-center justify-center text-gray-500 hover:text-white"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {!isPlaying ? (
              <button
                onClick={handleStart}
                disabled={isLoading}
                className={`w-full py-4.5 rounded-2xl font-black text-lg tracking-widest transition-all active:scale-[0.98] ${
                  isLoading
                    ? "bg-gray-700 text-gray-400"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-[0_10px_25px_rgba(37,99,235,0.4)] hover:brightness-110"
                }`}
              >
                {isLoading ? "INICIANDO..." : "APOSTAR"}
              </button>
            ) : (
              <button
                onClick={handleCashout}
                disabled={revealedCount === 0 || isLoading}
                className={`w-full py-4.5 rounded-2xl font-black text-lg tracking-widest transition-all active:scale-[0.98]
                  ${
                    revealedCount === 0 || isLoading
                      ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-green-600 to-emerald-500 shadow-[0_10px_25px_rgba(16,185,129,0.3)] hover:brightness-110"
                  }
                `}
              >
                {isLoading
                  ? "PROCESSANDO..."
                  : `SAQUE ${(betAmount * currentMultiplier).toFixed(2)} MT`}
              </button>
            )}
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `,
        }}
      />
    </div>
  );
};

export default MinesGame;
