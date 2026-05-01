"use client";

import { useAppStore } from "@/lib/store";
import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GamePlayer } from "@/components/GamePlayer";

// Mapa de nomes para exibir no Header
const GAME_NAMES: Record<string, string> = {
  "aviator": "Aviator",
  "taxi-crash": "Taxi Crash",
  "earplane": "Earplane",
  "purple-crash": "Purple Crash",
  "plinko": "Plinko",
  "chicken-highway": "Chicken Highway",
  "augustus-crash": "Augustus Crash",
  "bottle-mania": "Bottle Mania",
  "fishinator": "Fishinator",
  "football-x": "Football X",
  "subway-crash": "Subway Crash",
  "mines": "Mines",
  "mega-fruits": "Mega Fruits",
  "lion-zama": "Lion Zama",
};

export default function PlayGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { isLoggedIn } = useAppStore();
  const router = useRouter();
  const resolvedParams = use(params);
  const gameId = resolvedParams.id;

  // Proteção: Se não estiver logado, redirecionar para Home + popup registo
  useEffect(() => {
    if (!isLoggedIn) {
      useAppStore.getState().openRegister();
      router.push("/");
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!gameId || !GAME_NAMES[gameId]) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <p>Jogo não encontrado</p>
      </div>
    );
  }

  // Modo real SEMPRE — sem demo
  const engineUrl = `/engine/${gameId}?mode=real`;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <GamePlayer 
        gameId={gameId}
        gameName={GAME_NAMES[gameId]}
        iframeUrl={engineUrl}
        mode="real"
      />
    </div>
  );
}
