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
      {/* Game Header Overlay - Apenas Sair e Tela Cheia no Canto Superior Direito */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 flex items-center gap-2 pointer-events-none">
          <Button 
            variant="ghost" 
            size="icon" 
            className="bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white rounded-md pointer-events-auto h-8 w-8 sm:h-10 sm:w-10 transition-all shadow-xl"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />}
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="bg-red-600/80 hover:bg-red-600 backdrop-blur-md border border-red-500/50 text-white rounded-md pointer-events-auto h-8 w-8 sm:h-10 sm:w-10 transition-all shadow-xl"
            onClick={() => {
              if (document.fullscreenElement) document.exitFullscreen();
              router.back();
            }}
          >
            <span className="font-bold text-lg leading-none">×</span>
          </Button>
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
