"use client";

import { X, Info, Send, Smile, BadgeCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChatGlobalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayGame?: (gameId: string) => void;
}

interface WinMessage {
  id: number;
  type: "win";
  user: string;
  game: string;
  gameId: string;
  multiplier: number;
  amount: number;
  bet: number;
  time: string;
}

const GAMES = [
  { id: "aviator", name: "Aviator", emoji: "✈️" },
  { id: "taxi-crash", name: "Taxi Crash", emoji: "🚕" },
  { id: "earplane", name: "Earplane", emoji: "🎧" },
  { id: "purple-crash", name: "Crash", emoji: "🚀" },
  { id: "plinko", name: "Plinko777", emoji: "🎯" },
  { id: "mines", name: "Mines", emoji: "💣" },
];

const maskUser = () => {
  const prefix = ["84", "85", "86", "87"][Math.floor(Math.random() * 4)];
  const last = String(Math.floor(Math.random() * 10));
  return `${prefix.slice(0, 1)}***${last}`;
};

const generateWin = (id: number): WinMessage => {
  const game = GAMES[Math.floor(Math.random() * GAMES.length)];
  const multiplier = +(Math.random() * 15 + 1.2).toFixed(2);
  const isBigWin = Math.random() > 0.8;
  const bet = isBigWin ? +(Math.random() * 5000 + 1000).toFixed(2) : +(Math.random() * 500 + 10).toFixed(2);
  const amount = isBigWin ? +(40000 + Math.random() * 20000).toFixed(2) : +(bet * multiplier).toFixed(2);
  
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
  return {
    id,
    type: "win",
    user: maskUser(),
    game: game.name,
    gameId: game.id,
    multiplier: isBigWin ? +(amount / bet).toFixed(2) : multiplier,
    amount,
    bet,
    time,
  };
};

export default function ChatGlobal({ isOpen, onClose, onPlayGame }: ChatGlobalProps) {
  const [messages, setMessages] = useState<WinMessage[]>([]);
  const [input, setInput] = useState("");
  const [online] = useState(() => Math.floor(Math.random() * 40) + 45);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;
    if (messages.length === 0) {
      const seed = Array.from({ length: 4 }, () => generateWin(++idRef.current));
      setMessages(seed);
    }
    const interval = setInterval(() => {
      setMessages((prev) => [...prev.slice(-30), generateWin(++idRef.current)]);
    }, 300000);
    return () => clearInterval(interval);
  }, [isOpen, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="surface-card w-full md:max-w-md h-full flex flex-col animate-slide-right relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <span className="text-primary text-lg">💬</span>
            </div>
            <h2 className="text-lg font-extrabold tracking-tight">Chat Global</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-bold">{online}</span>
            </div>
            <button className="text-muted-foreground hover:text-foreground">
              <Info size={18} />
            </button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Mensagens */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((m) => (
            <div key={m.id} className="space-y-2">
              {/* Anúncio do bot */}
              <div className="flex gap-2">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-xs shrink-0 relative">
                  B
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] bg-primary text-primary-foreground px-1 rounded font-extrabold">BOT</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm font-bold">captain</span>
                    <BadgeCheck size={14} className="text-primary fill-primary text-background" />
                    <span className="text-[10px] text-muted-foreground ml-auto">{m.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    🌟 <strong className="text-foreground">*TOP WIN!*</strong> Wau! 😱 O usuário <strong className="text-foreground">*{m.user.slice(0, 2)}**</strong> <strong className="text-foreground">**{m.user.slice(-1)}*</strong> acaba de quebrar o recorde com{" "}
                    <strong className="text-foreground">*{m.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} MT*</strong> no <strong className="text-foreground">*{m.game}*</strong> com um multiplicador de <strong className="text-foreground">*{m.multiplier}x*</strong>! 🔥
                  </p>
                </div>
              </div>

              {/* Card de vitória */}
              <div className="flex gap-2">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0 text-base">
                  🧑🏽
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm font-bold">{m.user}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{m.time}</span>
                  </div>
                  <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, hsl(280 50% 25%), hsl(260 50% 20%))" }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm">🧑🏽</div>
                        <span className="text-sm font-extrabold text-white">{m.user}</span>
                      </div>
                      <BadgeCheck size={20} className="text-primary" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-[10px] font-bold tracking-wider text-white/60 mb-0.5">SACOU:</p>
                        <p className="text-2xl font-extrabold" style={{ color: "hsl(290 100% 70%)" }}>
                          {m.multiplier}x
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold tracking-wider text-white/60 mb-0.5">GANHO:</p>
                        <p className="text-2xl font-extrabold text-primary leading-tight">
                          {m.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-base font-extrabold text-primary leading-tight">MZN</p>
                      </div>
                    </div>
                    <div className="border-t border-white/10 pt-3 grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-[10px] font-bold tracking-wider text-white/60 mb-0.5">RODADA:</p>
                        <p className="text-base font-bold text-white">{(m.multiplier * 1.3).toFixed(2)}x</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold tracking-wider text-white/60 mb-0.5">APOSTA:</p>
                        <p className="text-base font-bold text-white">{m.bet.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} MZN</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onPlayGame?.(m.gameId)}
                      className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-extrabold tracking-wider transition-colors"
                    >
                      JOGAR {m.game.toUpperCase()}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 150))}
                placeholder="Digite a sua mensagem..."
                className="w-full bg-secondary rounded-xl px-4 py-3 pr-14 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">
                {input.length}/150
              </span>
            </div>
            <button className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition-all">
              <Send size={18} />
            </button>
          </div>
          <div className="flex items-center gap-3 mt-3 px-1">
            <button className="text-muted-foreground"><Smile size={18} /></button>
            <span className="ml-auto text-[10px] text-muted-foreground font-mono">150</span>
          </div>
        </div>
      </div>
    </div>
  );
}
