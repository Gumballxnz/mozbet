"use client";

import { X, Info, Send, Smile, BadgeCheck } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

interface ChatGlobalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayGame?: (gameId: string) => void;
}

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  type: "message" | "win_announcement" | "system";
  metadata?: any;
  created_at: string;
}

export default function ChatGlobal({ isOpen, onClose, onPlayGame }: ChatGlobalProps) {
  const { isLoggedIn } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [online] = useState(() => Math.floor(Math.random() * 40) + 45); // Fake online users count (can be updated to real presence later)
  const scrollRef = useRef<HTMLDivElement>(null);
  const isFetched = useRef(false);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/history?limit=50");
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.error("Erro ao buscar histórico do chat:", err);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (!isFetched.current) {
      fetchHistory();
      isFetched.current = true;
    }

    // Subscrever a novas mensagens
    const channel = supabase
      .channel("public:chat_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => [...prev, newMsg]);
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, fetchHistory]);

  // Lógica do BOT automático "nr 84*9 ganhou 20mil no aviator"
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      const games = [
        { id: "aviator", name: "Aviator" },
        { id: "footballx", name: "Football X" },
        { id: "megafruits", name: "Mega Fruits" },
        { id: "taxi-crash", name: "Taxi Crash" }
      ];
      const g = games[Math.floor(Math.random() * games.length)];
      const winAmount = Math.floor(Math.random() * 40000) + 500;
      const prefix = ["84", "85", "86", "87"][Math.floor(Math.random() * 4)];
      const lastDigit = Math.floor(Math.random() * 9);
      const username = `${prefix}***${lastDigit}`;

      const newBotMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        user_id: "system-bot",
        username: "MOZBET BOT",
        message: `${username} ganhou ${winAmount.toLocaleString("pt-MZ")} MT no ${g.name}!`,
        type: "win_announcement",
        metadata: {
          username: username,
          amount: winAmount,
          game_id: g.id,
          game_name: g.name
        },
        created_at: new Date().toISOString()
      };

      setMessages((prev) => [...prev, newBotMsg]);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        }
      }, 100);
    }, 12000); // 12 seconds

    return () => clearInterval(interval);
  }, [isOpen]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  };

  const handleSend = async () => {
    if (!isLoggedIn) {
      toast.error("Faz login para participar no chat");
      return;
    }
    
    if (!input.trim() || isSending) return;

    const messageText = input.trim();
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar");
      setInput(messageText); // Devolver texto em caso de erro
    } finally {
      setIsSending(false);
    }
  };

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
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm mt-10">
              Nenhuma mensagem ainda. Sê o primeiro a falar!
            </div>
          )}

          {messages.map((m) => {
            const timeStr = new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            
            // 1. ANÚNCIO DE VITÓRIA (WIN_ANNOUNCEMENT)
            if (m.type === "win_announcement") {
              const meta = m.metadata || {};
              return (
                <div key={m.id} className="space-y-2">
                  <div className="flex gap-2">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-xs shrink-0 relative">
                      B
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] bg-primary text-primary-foreground px-1 rounded font-extrabold">BOT</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-bold">MOZBET</span>
                        <BadgeCheck size={14} className="text-primary fill-primary text-background" />
                        <span className="text-[10px] text-muted-foreground ml-auto">{timeStr}</span>
                      </div>
                      <div className="rounded-2xl p-4 mt-1" style={{ background: "linear-gradient(135deg, hsl(280 50% 25%), hsl(260 50% 20%))" }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-white">{m.username}</span>
                          </div>
                          <BadgeCheck size={20} className="text-primary" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <p className="text-[10px] font-bold tracking-wider text-white/60 mb-0.5">SACOU:</p>
                            <p className="text-2xl font-extrabold" style={{ color: "hsl(290 100% 70%)" }}>
                              {meta.multiplier}x
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold tracking-wider text-white/60 mb-0.5">GANHO:</p>
                            <p className="text-2xl font-extrabold text-primary leading-tight">
                              {Number(meta.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-base font-extrabold text-primary leading-tight">MZN</p>
                          </div>
                        </div>
                        <button
                          onClick={() => onPlayGame?.("aviator")} // Futuramente pode vir do metadata
                          className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-extrabold tracking-wider transition-colors"
                        >
                          JOGAR AGORA
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // 2. MENSAGEM NORMAL DO JOGADOR
            return (
              <div key={m.id} className="flex gap-2">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0 text-base">
                  🧑🏽
                </div>
                <div className="flex-1 bg-secondary/30 rounded-2xl rounded-tl-none p-3 border border-border/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-primary">{m.username}</span>
                    <span className="text-[10px] text-muted-foreground">{timeStr}</span>
                  </div>
                  <p className="text-sm text-foreground/90 break-words">{m.message}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 bg-background">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 150))}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={isLoggedIn ? "Digite a sua mensagem..." : "Faça login para falar..."}
                disabled={!isLoggedIn || isSending}
                className="w-full bg-secondary rounded-xl px-4 py-3 pr-14 text-sm outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">
                {input.length}/150
              </span>
            </div>
            <button 
              onClick={handleSend}
              disabled={!isLoggedIn || !input.trim() || isSending}
              className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
