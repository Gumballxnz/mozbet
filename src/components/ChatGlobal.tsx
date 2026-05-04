"use client";

import { X, Info, Send, BadgeCheck, Megaphone } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { socket } from "@/lib/socket";

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
  type: "message" | "win_announcement" | "system" | "fake_user";
  metadata?: any;
  created_at: string;
  avatar?: string;
}

// ===== AVATARES DO SITE =====
const SITE_AVATARS = [
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=f59e0b",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&backgroundColor=10b981",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Jack&backgroundColor=3b82f6",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Molly&backgroundColor=8b5cf6",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&backgroundColor=ef4444",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe&backgroundColor=ec4899",
];

// Função de hash simples para distribuir avatares consistentemente
function getConsistentAvatar(userId: string): string {
  if (!userId) return SITE_AVATARS[0];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SITE_AVATARS[Math.abs(hash) % SITE_AVATARS.length];
}

// Extrair avatar da mensagem
function getAvatar(m: ChatMessage): string {
  if (m.avatar) return m.avatar;
  if (m.metadata?.avatar) return m.metadata.avatar;
  return getConsistentAvatar(m.user_id || m.username);
}

// Mostrar apenas ID Mascarado (Privacidade total)
function maskId(username: string): string {
  if (!username) return "USER***";
  const cleanId = username.includes("-") ? username.split("-")[0] : username;
  if (/^\d/.test(cleanId)) {
    return "MZ" + cleanId.slice(0, 3).toUpperCase() + "***";
  }
  return cleanId.slice(0, 4).toUpperCase() + "***";
}

// Online count dinâmico baseado na hora (funciona sem VPS)
function getDynamicOnlineCount(): number {
  const hour = new Date().getHours();
  let base = 150;
  if (hour >= 0 && hour <= 4) base = 450;
  else if (hour > 4 && hour <= 10) base = 120;
  else if (hour > 10 && hour <= 18) base = 280;
  else if (hour > 18 && hour <= 23) base = 580;
  const variation = Math.floor(Math.sin(Date.now() / 5000) * 15);
  return base + variation;
}

// ===== COMPONENTE PRINCIPAL =====
export default function ChatGlobal({ isOpen, onClose, onPlayGame }: ChatGlobalProps) {
  const { isLoggedIn, fakeChatMessages: messages, setFakeChatMessages: setMessages, onlineCount, setOnlineCount } = useAppStore();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Sincronizar online count
  useEffect(() => {
    const updateCount = () => setOnlineCount(getDynamicOnlineCount());
    const interval = setInterval(updateCount, 5000);
    updateCount();
    return () => clearInterval(interval);
  }, [setOnlineCount]);

  // Carregar histórico + ouvir Realtime (fonte PRINCIPAL de mensagens)
  useEffect(() => {
    // 1. Carregar histórico do banco
    const loadHistory = async () => {
      try {
        const res = await fetch("/api/chat/history");
        const data = await res.json();
        if (data.history) {
          setMessages(data.history);
          if (isOpen) requestAnimationFrame(() => scrollToBottom());
        }
      } catch (err) {
        console.error("Erro ao carregar histórico:", err);
      }
    };
    loadHistory();

    // 2. Ouvir mensagens via SUPABASE REALTIME (fonte principal — global para todos)
    const channel = supabase.channel('global-chat-room')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, (payload) => {
        const newMessage = payload.new as ChatMessage;
        setMessages((prev: ChatMessage[]) => {
          if (prev.some(m => m.id === newMessage.id)) return prev;
          return [...prev, newMessage].slice(-100);
        });
        if (isOpen) setTimeout(scrollToBottom, 100);
      })
      .subscribe((status, err) => {
        if (err && !err.message?.includes("1000") && !err.message?.includes("closed before")) {
          // Apenas loga erros reais, ignora aborts de fechamento
        }
      });

    // 3. Socket.io como bónus opcional (se VPS estiver a emitir por esta via)
    const onSocketMessage = (newMessage: ChatMessage) => {
      setMessages((prev: ChatMessage[]) => {
        if (prev.some(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage].slice(-100);
      });
      if (isOpen) setTimeout(scrollToBottom, 100);
    };
    socket.on("receive_message", onSocketMessage);

    return () => {
      socket.off("receive_message", onSocketMessage);
      supabase.removeChannel(channel);
    };
  }, [setMessages, scrollToBottom, isOpen]);

  const handleSend = async () => {
    if (!isLoggedIn) {
      toast.error("Faz login para participar no chat");
      return;
    }
    if (!input.trim() || isSending) return;

    const messageText = input.trim();
    const user = useAppStore.getState().user;

    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, avatar: user?.avatar }),
      });
      if (!res.ok) throw new Error("Erro ao enviar");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar");
      setInput(messageText);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="surface-card w-[65%] sm:w-[55%] md:max-w-md h-full flex flex-col animate-slide-right relative z-10 shadow-2xl border-l border-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <span className="text-primary text-lg">💬</span>
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">Chat ao Vivo</h2>
              <p className="text-[10px] font-bold text-primary">
                🟢 {onlineCount} online agora
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-bold text-primary">{onlineCount}</span>
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
            const timeStr = new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

            // 1. ANÚNCIO DE VITÓRIA
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
                            <span className="text-sm font-extrabold text-white">{meta.username || maskId(m.username)}</span>
                          </div>
                          <BadgeCheck size={20} className="text-primary" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <p className="text-[10px] font-bold tracking-wider text-white/60 mb-0.5">SACOU:</p>
                            <p className="text-2xl font-extrabold" style={{ color: "hsl(290 100% 70%)" }}>
                              {meta.multiplier || "2.00"}x
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold tracking-wider text-white/60 mb-0.5">GANHO:</p>
                            <p className="text-2xl font-extrabold text-primary leading-tight">
                              {Number(meta.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-base font-extrabold text-primary leading-tight">MZN</p>
                          </div>
                        </div>
                        <button
                          onClick={() => onPlayGame?.(meta.game_id || "aviator")}
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

            // 2. MENSAGEM DE SISTEMA (Bónus, promoções, avisos)
            if (m.type === "system") {
              const meta = m.metadata || {};
              return (
                <div key={m.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex gap-2">
                    <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                      <Megaphone size={16} className="text-amber-400" />
                    </div>
                    <div className="flex-1 bg-gradient-to-r from-amber-500/10 to-orange-500/5 rounded-2xl rounded-tl-none p-3 border border-amber-500/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-extrabold text-amber-400">{meta.title || "📢 MOZBET"}</span>
                        <span className="text-[10px] text-muted-foreground">{timeStr}</span>
                      </div>
                      <p className="text-sm text-foreground/90">{m.message}</p>
                    </div>
                  </div>
                </div>
              );
            }

            // 3. MENSAGEM FAKE DE JOGADOR
            if (m.type === "fake_user") {
              return (
                <div key={m.id} className="flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-white/10">
                    <img src={getAvatar(m)} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 bg-white/[0.04] rounded-2xl rounded-tl-none p-3 border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-emerald-400">{maskId(m.username)}</span>
                      <span className="text-[10px] text-muted-foreground">{timeStr}</span>
                    </div>
                    <p className="text-sm text-foreground/90 break-words">{m.message}</p>
                  </div>
                </div>
              );
            }

            // 4. MENSAGEM REAL DO JOGADOR
            return (
              <div key={m.id} className="flex gap-2">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0 text-base overflow-hidden">
                  <img src={getAvatar(m)} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 bg-secondary/30 rounded-2xl rounded-tl-none p-3 border border-border/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-primary">{maskId(m.username)}</span>
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
