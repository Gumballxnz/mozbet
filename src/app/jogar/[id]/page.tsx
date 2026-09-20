"use client";

import { useAppStore } from "@/lib/store";
import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GamePlayer } from "@/components/GamePlayer";

const GAME_NAMES: Record<string, string> = {
  "aviator": "Aviator",
  "taxi-crash": "Taxi Crash",
  "earplane": "Earplane",
  "purple-crash": "Purple Crash",
  "space-crash": "Space Crash",
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
  const { isLoggedIn, user } = useAppStore();
  const router = useRouter();
  const resolvedParams = use(params);
  const gameId = resolvedParams.id;

  useEffect(() => {
    if (!isLoggedIn) {
      useAppStore.getState().openRegister();
      router.push("/");
    } else {
      const totalBalance = (user?.balance || 0) + (user?.bonusBalance || 0);
      if (!user?.isAdmin && totalBalance <= 0) {

        useAppStore.getState().setDepositOpen(true);
        router.push("/");
      }
    }
  }, [isLoggedIn, user, router, gameId]);

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
  const engineUrl = `/engine/${gameId}`;

  return (
    <div className="w-full max-w-[1400px] mx-auto pt-2 pb-8 px-0 sm:px-4">
      <div className="w-full h-[650px] md:h-[calc(100vh-140px)] lg:h-[calc(100vh-140px)] rounded-none sm:rounded-2xl overflow-hidden shadow-2xl bg-black border sm:border-white/10">
        <GamePlayer
          gameId={gameId}
          gameName={GAME_NAMES[gameId]}
          iframeUrl={engineUrl}
          mode="real"
        />
      </div>
    </div>
  );
}
