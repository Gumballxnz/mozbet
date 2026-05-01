"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Headphones, X, Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/useTranslation";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";

type Message = {
  role: "user" | "model";
  content: string;
};

export function SupportChat() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { supportOpen, setSupportOpen } = useAppStore();
  
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", content: "Olá! Sou o assistente de suporte da MOZBET. Como posso ajudar?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Carregar histórico ao abrir o chat
  useEffect(() => {
    if (supportOpen && !historyLoaded) {
      async function loadHistory() {
        try {
          const res = await fetch("/api/support/history");
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages.map((m: any) => ({
              role: m.role,
              content: m.content
            })));
          }
        } catch (error) {
          console.error("Erro ao carregar histórico do suporte", error);
        } finally {
          setHistoryLoaded(true);
        }
      }
      loadHistory();
    }
  }, [supportOpen, historyLoaded]);

  // Estado do botão flutuante: posição e visibilidade
  const [fabVisible, setFabVisible] = useState(true);
  const [fabPosition, setFabPosition] = useState({ x: -1, y: -1 }); // -1 = posição padrão
  const [isDragging, setIsDragging] = useState(false);
  const [showCloseHint, setShowCloseHint] = useState(false);
  const dragRef = useRef<HTMLButtonElement>(null);
  const dragStart = useRef({ x: 0, y: 0, startX: 0, startY: 0, moved: false });

  // Inicializar posição padrão
  useEffect(() => {
    if (fabPosition.x === -1) {
      setFabPosition({ x: window.innerWidth - 72, y: window.innerHeight - 140 });
    }
  }, [fabPosition.x]);

  // Drag handlers (funciona com touch e mouse)
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    dragStart.current = { x: clientX, y: clientY, startX: fabPosition.x, startY: fabPosition.y, moved: false };
    setIsDragging(true);
    setShowCloseHint(true);
  }, [fabPosition]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;
    if (Math.abs(dx) > 15 || Math.abs(dy) > 15) dragStart.current.moved = true;
    
    const newX = Math.max(0, Math.min(window.innerWidth - 56, dragStart.current.startX + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - 56, dragStart.current.startY + dy));
    setFabPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setShowCloseHint(false);
    if (!dragStart.current.moved) {
      setSupportOpen(true);
    }
  }, [setSupportOpen]);

  // Mouse events
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);
    const onUp = () => handleDragEnd();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Auto-scroll para o fundo do chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, supportOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMessage,
          history: messages.filter(m => m.content !== "Olá! Sou o assistente de suporte da MOZBET. Como posso ajudar?") 
        }),
      });

      const data = await res.json();
      
      if (data.error) {
        setMessages([...newMessages, { role: "model", content: data.error }]);
      } else {
        setMessages([...newMessages, { role: "model", content: data.response }]);
      }
    } catch (error) {
      setMessages([...newMessages, { role: "model", content: "Erro de ligação ao suporte." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botão Flutuante Arrastável */}
      {!supportOpen && fabVisible && pathname === "/" && (
        <div className="fixed z-50" style={{ left: fabPosition.x, top: fabPosition.y }}>
          {/* Botão X para remover o fab */}
          {showCloseHint && (
            <button
              onClick={(e) => { e.stopPropagation(); setFabVisible(false); }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs z-10 shadow-lg animate-in fade-in"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            ref={dragRef}
            onClick={() => {
              if (!dragStart.current.moved) {
                setSupportOpen(true);
              }
            }}
            onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
            onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={handleDragEnd}
            onContextMenu={(e) => { e.preventDefault(); setShowCloseHint(!showCloseHint); }}
            className={`w-14 h-14 bg-primary text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,255,127,0.4)] transition-transform ${
              isDragging ? "scale-110 cursor-grabbing" : "hover:scale-105 cursor-grab animate-pulse-glow"
            }`}
          >
            <Headphones className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Janela de Chat de Suporte IA */}
      {supportOpen && (
        <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-[350px] h-[450px] max-h-[70vh] bg-surface-elevated border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="bg-primary/10 border-b border-primary/20 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">MOZBET Suporte</h3>
                <p className="text-[10px] text-primary glow-primary">🟢 Online (IA)</p>
              </div>
            </div>
            <button 
              onClick={() => setSupportOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mensagens */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                  msg.role === "user" ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary"
                }`}>
                  {msg.role === "user" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  msg.role === "user" 
                    ? "bg-accent/20 border border-accent/30 text-white rounded-tr-sm" 
                    : "bg-background border border-border text-foreground rounded-tl-sm"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-3 h-3" />
                </div>
                <div className="bg-background border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 bg-surface border-t border-border flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escreva a sua dúvida..."
              className="flex-1 bg-background h-10"
              disabled={loading}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="h-10 w-10 shrink-0" 
              disabled={loading || !input.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
