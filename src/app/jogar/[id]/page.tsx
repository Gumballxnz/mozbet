"use client";

import { useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { use } from "react";
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
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "demo";
  const { isLoggedIn } = useAppStore();
  
  // Forçar demo se não estiver logado
  const isDemo = mode === "demo" || !isLoggedIn;

  const resolvedParams = use(params);
  const gameId = resolvedParams.id;

  if (!gameId || !GAME_NAMES[gameId]) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <p>Jogo não encontrado</p>
      </div>
    );
  }

  // A mágica: Usar SEMPRE o nosso motor isolado!
  const engineUrl = `/engine/${gameId}?mode=${isDemo ? "demo" : "real"}`;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <GamePlayer 
        gameId={gameId}
        gameName={GAME_NAMES[gameId]}
        iframeUrl={engineUrl}
        mode={isDemo ? "demo" : "real"}
      />
    </div>
  );
}
