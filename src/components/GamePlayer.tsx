"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Maximize, Minimize, Volume2, VolumeX, Wallet } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { formatMZN } from "@/lib/utils";
import { toast } from "sonner";

export function GamePlayer({ 
  gameName, 
  iframeUrl, 
  mode,
  gameId 
}: { 
  gameName: string; 
  iframeUrl: string; 
  mode: "real" | "demo";
  gameId: string;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, isLoggedIn, updateBalance, setRegisterOpen, setDepositOpen } = useAppStore();
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Escutar mensagens vindas do motor isolado (Iframe Sandbox)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'UPDATE_BALANCE' && mode === 'real') {
        updateBalance(e.data.balance);
      } else if (e.data.type === 'ENGINE_READY' && mode === 'real' && user) {
        // Enviar o saldo atual para o Iframe assim que ele estiver pronto
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'SYNC_BALANCE', balance: user.balance },
          '*'
        );
      } else if (e.data.type === 'CLOSE_GAME') {
        if (document.fullscreenElement) document.exitFullscreen();
        router.back();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [mode, updateBalance, user, router]);

  // Proteção de Rota Client-Side
  useEffect(() => {
    if (mode === "real" && !isLoggedIn) {
      toast.error(t("error"), { description: t("loginRequired") });
      setRegisterOpen(true);
      router.push("/");
    }
  }, [mode, isLoggedIn, router, setRegisterOpen, t]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Prevenir tela preta se não estiver logado no modo real
  if (mode === "real" && !isLoggedIn) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-black text-white">
      {/* Game Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-2 sm:p-4 z-10 flex items-center justify-between pointer-events-none">
        <Button 
          variant="ghost" 
          size="icon" 
          className="bg-black/40 backdrop-blur-md border border-white/10 text-white rounded-full pointer-events-auto hover:bg-black/60"
          onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen();
            router.back();
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-2 pointer-events-auto">
          {mode === "demo" ? (
            <div className="px-3 py-1.5 bg-accent/80 text-white text-xs font-bold rounded-full backdrop-blur-md shadow-lg border border-white/20 animate-pulse">
              {t("demoMode")}
            </div>
          ) : (
            <div className="flex items-center bg-black/60 backdrop-blur-md border border-white/10 rounded-full p-1 pr-3 shadow-lg">
              <Button
                size="sm"
                className="h-7 rounded-full text-xs px-3 bg-primary text-black hover:bg-primary/90"
                onClick={() => setDepositOpen(true)}
              >
                <Wallet className="w-3 h-3 mr-1" />
                {t("deposit")}
              </Button>
              <span className="ml-3 font-mono-data text-sm font-bold glow-primary text-primary">
                {formatMZN(user?.balance || 0)}
              </span>
            </div>
          )}

          <Button 
            variant="ghost" 
            size="icon" 
            className="bg-black/40 backdrop-blur-md border border-white/10 text-white rounded-full hidden sm:flex hover:bg-black/60"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="bg-black/40 backdrop-blur-md border border-white/10 text-white rounded-full hidden sm:flex hover:bg-black/60"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Loading Skeleton da Tela de Jogo */}
      {!isIframeLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-elevated z-0">
          <div className="w-16 h-16 relative flex items-center justify-center mb-4">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mb-2">{gameName}</h2>
          <p className="text-sm text-muted-foreground animate-pulse">{t("loading")}...</p>
        </div>
      )}

      {/* Iframe Real do Jogo */}
      <iframe
        ref={iframeRef}
        src={iframeUrl}
        className={`w-full flex-1 border-none transition-opacity duration-500 ${isIframeLoaded ? "opacity-100" : "opacity-0"}`}
        allow="autoplay; fullscreen"
        allowFullScreen
        onLoad={() => setIsIframeLoaded(true)}
      />
    </div>
  );
}
