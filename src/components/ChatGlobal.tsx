"use client";

import { X, Info, Send, BadgeCheck } from "lucide-react";
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
  type: "message" | "win_announcement" | "system" | "fake_user";
  metadata?: any;
  created_at: string;
  avatar?: string;
}

// ===== AVATARES DO SITE (DiceBear Adventurer — mesmos do perfil) =====
const SITE_AVATARS = [
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=f59e0b",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&backgroundColor=10b981",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Jack&backgroundColor=3b82f6",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Molly&backgroundColor=8b5cf6",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&backgroundColor=ef4444",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe&backgroundColor=ec4899",
];

// Jogos do catálogo real do site
const GAME_POOL = [
  { id: "aviator", name: "Aviator" },
  { id: "taxi-crash", name: "Taxi Crash" },
  { id: "earplane", name: "Earplane" },
  { id: "purple-crash", name: "Crash" },
  { id: "subway-crash", name: "Subway Crash" },
  { id: "augustus-crash", name: "Augustus Crash" },
  { id: "chicken-highway", name: "Chicken Highway" },
  { id: "mines", name: "Mines" },
  { id: "plinko", name: "Plinko777" },
  { id: "bottle-mania", name: "Bottle Mania" },
  { id: "fishinator", name: "Fishinator" },
  { id: "football-x", name: "Football X" },
  { id: "lion-zama", name: "Lion Zama" },
  { id: "mega-fruits", name: "Mega Fruits" },
];

// IDs Partilhados com a Tabela de Apostas para consistência
const SHARED_FAKE_IDS = [
  "A8B2C4F1", "F9D3E2A0", "B7C1D9F4", "E4A2B5C1", "D1F8E3A2",
  "C5B4A1F9", "8F2D1A3B", "3C9E4B1F", "2A5B8C1D", "1E7F3D2A"
];

const generateFakeUsername = () => {
  return SHARED_FAKE_IDS[Math.floor(Math.random() * SHARED_FAKE_IDS.length)];
};

// Mostrar ID parcialmente (ex: "A3F2***" — primeiros 4 + ***)
function maskPlayerId(id: string): string {
  return id.slice(0, 4) + "***";
}

// ===== TEMPLATES DE MENSAGENS — mistura de ganhos, perdas e conversa casual =====
const MESSAGE_TEMPLATES: Array<(id: string, amount: number, game: string) => string> = [
  // Testemunhos de ganhos
  (id, amount, game) => `Entrei com ${Math.floor(amount * 0.1)}MT e saquei ${amount}MT no ${game} 🔥`,
  (id, amount, game) => `Ganhei ${amount}MT hoje no ${game}! Só entrei com ${Math.floor(amount * 0.15)}MT 💰`,
  (id, amount, game) => `${amount}MT no ${game}!! Esta plataforma é real 🙌`,
  (id, amount, game) => `Acabei de sacar ${amount}MT no ${game}, entrei com apenas ${Math.floor(amount * 0.08)}MT`,
  (id, amount, game) => `${game} tá a pagar hoje!! Já fiz ${amount}MT 🚀`,
  (id, amount, game) => `${amount}MT em 10 minutos no ${game}, quem não acredita experimenta`,
  (id, amount, game) => `Entrei com 20MT e saí com ${amount}MT no ${game} 😂🔥`,
  (id, amount, game) => `Já sacaram? Eu acabei de tirar ${amount}MT do ${game}`,
  (id, amount, game) => `Meus ${amount}MT já caíram no M-Pesa! ${game} nunca falha`,
  (id, amount, game) => `Primeiro dia aqui e já fiz ${amount}MT no ${game} 💚`,
  (id, amount, game) => `Mais ${amount}MT no bolso graças ao ${game} 🤑`,
  (id, amount, game) => `Com 50MT fiz ${amount}MT no ${game}`,
  (id, amount, game) => `Depositei 100MT e tô com ${amount}MT agora só no ${game}`,
  (id, amount, game) => `${amount}MT direto no M-Pesa, sem stress`,
  (id, amount, game) => `Não acredito que fiz ${amount}MT num dia no ${game}!! 😱`,
  (id, amount, game) => `${game} pagou-me ${amount}MT agora!! Obrigado MOZBET`,

  // Mensagens de quem perdeu
  (id, amount, game) => `Perdi 50MT no ${game} mas vou recuperar 😤`,
  (id, amount, game) => `${game} me comeu hoje... amanhã volto mais forte`,
  (id, amount, game) => `Tava a ganhar no ${game} e fiquei ganancioso, perdi tudo 💀`,
  (id, amount, game) => `Não sacou a tempo no ${game}... aprendi a lição`,
  (id, amount, game) => `Perdi 100MT no ${game} kkkk vou tentar o Mines agora`,
  (id, amount, game) => `O ${game} tá difícil hoje, vou mudar de jogo`,

  // Conversa casual / comunidade
  (_id, _a, game) => `Alguém mais tá a jogar ${game}? Vamos trocar dicas`,
  (_id, _a, _g) => `Boa noite pessoal, quem tá a jogar agora?`,
  (_id, _a, _g) => `MOZBET é a melhor plataforma de Moçambique 💯`,
  (_id, _a, game) => `Vou jogar mais uma rodada no ${game}, tô com sorte hoje`,
  (_id, _a, _g) => `Quem diz que não se ganha aqui nunca tentou 😂`,
  (_id, _a, _g) => `Saque caiu em 2 minutos no M-Pesa, incrível 🔥`,
  (_id, _a, game) => `Minha estratégia no ${game}: entrar com pouco e sair na hora certa 🧠`,
  (_id, _a, _g) => `Pessoal, boa sorte pra todos! 🍀`,
  (_id, _a, game) => `${game} é viciante demais kkkk`,
  (_id, _a, _g) => `Boa noite campeões! Quem já ganhou hoje? 🏆`,
  (_id, _a, _g) => `Alguém no Aviator agora?`,
  (_id, _a, _g) => `Já é o 3° saque hoje 😎 MOZBET não brinca`,
  (_id, _a, game) => `Começando o dia no ${game}, desejem-me sorte! 🤞`,
  (_id, _a, _g) => `Qual o melhor jogo pra começar? Sou novo aqui`,
  (_id, _a, _g) => `Mines ou Aviator? Qual rende mais?`,
  (_id, _a, game) => `${game} tá generoso hoje pessoal`,
  (_id, _a, _g) => `Alguém sabe quando vão adicionar mais jogos?`,
  (_id, _a, _g) => `Bom dia a todos 🌅 vamos lucrar!`,
];

// Motor Determinístico de Mensagens
function getDeterministicChatMessages(count: number): ChatMessage[] {
  const now = Date.now();
  const currentSecond = Math.floor(now / 1000);
  const results: ChatMessage[] = [];
  
  // Como o chat global tem uma velocidade que pode variar com o número de utilizadores,
  // vamos gerar mensagens para cada 3 segundos como base determinística
  for (let i = count; i >= 0; i--) {
    const seed = currentSecond - (i * 3); // Mensagem a cada 3 segundos
    
    // Filtro para não gerar a CADA 3 segundos sempre, mas dar espaços realistas
    const probability = (Math.abs(Math.sin(seed * 1111)) * 100) % 100;
    if (probability > 70) continue; // 70% de chance de ter uma mensagem nestes 3s
    
    const pseudoRandom = (Math.abs(Math.sin(seed * 9999)) * 10000) % 1;
    const templateIdx = Math.floor(pseudoRandom * MESSAGE_TEMPLATES.length);
    const templateFn = MESSAGE_TEMPLATES[templateIdx];
    
    const avatarIdx = Math.floor((Math.abs(Math.cos(seed * 8888)) * 10000) % SITE_AVATARS.length);
    const avatar = SITE_AVATARS[avatarIdx];
    
    const chars = "ABCDEF0123456789";
    let playerId = "";
    for (let j = 0; j < 8; j++) {
      playerId += chars[Math.floor(((pseudoRandom * 100) + j) % chars.length)];
    }
    const maskedId = maskPlayerId(playerId);
    
    const gameIdx = Math.floor((Math.abs(Math.sin(seed * 7777)) * 10000) % GAME_POOL.length);
    const game = GAME_POOL[gameIdx];
    
    const amounts = [150, 200, 350, 500, 750, 1000, 1200, 1500, 2000, 2500, 3000, 4500, 5000, 7500, 10000, 15000, 20000];
    const amountIdx = Math.floor((Math.abs(Math.cos(seed * 6666)) * 10000) % amounts.length);
    const amount = amounts[amountIdx];
    
    const messageText = templateFn(maskedId, amount, game.name);
    
    results.push({
      id: `det-${seed}`,
      user_id: `fake-${playerId}`,
      username: maskedId,
      message: messageText,
      type: "fake_user",
      avatar,
      metadata: { game_id: game.id, game_name: game.name, amount },
      created_at: new Date(seed * 1000).toISOString(),
    });
  }
  return results;
}

// ===== COMPONENTE PRINCIPAL =====
export default function ChatGlobal({ isOpen, onClose, onPlayGame }: ChatGlobalProps) {
  const { isLoggedIn, fakeChatMessages: messages, setFakeChatMessages: setMessages } = useAppStore();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [online, setOnline] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll function
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Sincronizar contagem de online com o servidor
  useEffect(() => {
    if (!isOpen) return;
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/game/stats");
        const data = await res.json();
        // Online real + factor pra parecer mais cheio
        if (data.online) setOnline(data.online);
      } catch (err) {}
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Motor Determinístico Contínuo
  useEffect(() => {
    if (!isOpen) return;

    // Gerar 20 mensagens do passado recente + atuais
    const initialDeterministic = getDeterministicChatMessages(20);
    setMessages(initialDeterministic);
    setTimeout(scrollToBottom, 200);

    const interval = setInterval(() => {
      // Pega os últimos 15 segundos para ver se há mensagem nova
      const newDetMessages = getDeterministicChatMessages(5);
      
      const currentMessages = useAppStore.getState().fakeChatMessages;
      // Criar um Set de IDs para não duplicar
      const existingIds = new Set(currentMessages.map((m: any) => m.id));
      const messagesToAdd = newDetMessages.filter(m => !existingIds.has(m.id));
      
      if (messagesToAdd.length > 0) {
        // PRESERVAR mensagens reais (tipo !== 'fake_user' e !== 'win_announcement')
        // Juntar tudo, ordenar por data e manter limite
        const merged = [...currentMessages, ...messagesToAdd]
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .slice(-100);
        setMessages(merged);
        setTimeout(scrollToBottom, 50);
      }
    }, 5000); // Check a cada 5 segundos (Otimização Mobile)

    // Supabase subscription (para as tuas próprias mensagens reais que mandares pro chat)
    const channel = supabase
      .channel("public:chat_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          const currentMsgs = useAppStore.getState().fakeChatMessages;
          setMessages([...currentMsgs, newMsg].slice(-100));
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [isOpen, setMessages, scrollToBottom]);


  // Anúncios de vitória do BOT MOZBET (mais espaçados)
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      const g = GAME_POOL[Math.floor(Math.random() * GAME_POOL.length)];
      const winAmount = Math.floor(Math.random() * 40000) + 500;
      const playerId = generateFakePlayerId();
      const maskedId = maskPlayerId(playerId);

      const newBotMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        user_id: "system-bot",
        username: "MOZBET BOT",
        message: `${maskedId} ganhou ${winAmount.toLocaleString("pt-MZ")} MT no ${g.name}!`,
        type: "win_announcement",
        metadata: {
          username: maskedId,
          amount: winAmount,
          game_id: g.id,
          game_name: g.name
        },
        created_at: new Date().toISOString()
      };

      setMessages([...useAppStore.getState().fakeChatMessages, newBotMsg].slice(-100));
      setTimeout(scrollToBottom, 100);
    }, 25000);

    return () => clearInterval(interval);
  }, [isOpen, setMessages]);



  const handleSend = async () => {
    if (!isLoggedIn) {
      toast.error("Faz login para participar no chat");
      return;
    }
    
    if (!input.trim() || isSending) return;

    const messageText = input.trim();
    const user = useAppStore.getState().user;
    const maskedName = user?.id ? user.id.split("-")[0].toUpperCase() : "USER";
    
    // OPTIMISTIC UI: Adicionar a mensagem IMEDIATAMENTE na tela
    const optimisticMsg: ChatMessage = {
      id: `real-${Date.now()}`,
      user_id: user?.id || "unknown",
      username: maskedName,
      message: messageText,
      type: "message",
      avatar: user?.avatar || SITE_AVATARS[0],
      created_at: new Date().toISOString(),
    };
    
    const currentMsgs = useAppStore.getState().fakeChatMessages;
    setMessages([...currentMsgs, optimisticMsg].slice(-100));
    setTimeout(scrollToBottom, 50);
    
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
      // Mensagem já está visível — a API confirmou o save no BD
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar");
      // Remover a mensagem optimistic se falhou
      const msgs = useAppStore.getState().fakeChatMessages;
      setMessages(msgs.filter(m => m.id !== optimisticMsg.id));
      setInput(messageText);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end" onClick={onClose}>
      {/* Overlay semi-transparente apenas na metade esquerda */}
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
              <p className="text-[10px] text-primary font-bold">🟢 {online} online agora</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-bold text-primary">{online}</span>
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
            
            // 1. ANÚNCIO DE VITÓRIA (WIN_ANNOUNCEMENT) — Card do BOT
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
                            <span className="text-sm font-extrabold text-white">{meta.username}</span>
                          </div>
                          <BadgeCheck size={20} className="text-primary" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <p className="text-[10px] font-bold tracking-wider text-white/60 mb-0.5">SACOU:</p>
                            <p className="text-2xl font-extrabold" style={{ color: "hsl(290 100% 70%)" }}>
                              {meta.multiplier || `${(Math.random() * 8 + 1.5).toFixed(2)}`}x
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

            // 2. MENSAGEM FAKE DE JOGADOR — Avatar DiceBear + ID parcial
            if (m.type === "fake_user") {
              return (
                <div key={m.id} className="flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-white/10">
                    <img src={m.avatar || SITE_AVATARS[0]} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 bg-white/[0.04] rounded-2xl rounded-tl-none p-3 border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-emerald-400">{m.username}</span>
                      <span className="text-[10px] text-muted-foreground">{timeStr}</span>
                    </div>
                    <p className="text-sm text-foreground/90 break-words">{m.message}</p>
                  </div>
                </div>
              );
            }

            // 3. MENSAGEM REAL DO JOGADOR
            return (
              <div key={m.id} className="flex gap-2">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0 text-base overflow-hidden">
                  <img src={SITE_AVATARS[0]} alt="" className="w-full h-full object-cover" />
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
