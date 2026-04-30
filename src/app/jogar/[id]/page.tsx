"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Suspense, lazy } from "react";

// Lazy loading de todos os jogos para performance
const AviatorGame = lazy(() => import("@/components/games/AviatorGame"));
const TaxiCrashGame = lazy(() => import("@/components/games/TaxiCrashGame"));
const EarplaneGame = lazy(() => import("@/components/games/EarplaneGame"));
const PurpleCrashGame = lazy(() => import("@/components/games/PurpleCrashGame"));
const PlinkoGame = lazy(() => import("@/components/games/PlinkoGame"));
const ChickenHighwayGame = lazy(() => import("@/components/games/ChickenHighwayGame"));
const AugustusCrashGame = lazy(() => import("@/components/games/AugustusCrashGame"));
const BottleManiaGame = lazy(() => import("@/components/games/BottleManiaGame"));
const FishinatorGame = lazy(() => import("@/components/games/FishinatorGame"));
const FootballXGame = lazy(() => import("@/components/games/FootballXGame"));
const SubwayCrashGame = lazy(() => import("@/components/games/SubwayCrashGame"));
const MinesGame = lazy(() => import("@/components/games/MinesGame"));
const MegaFruitsGame = lazy(() => import("@/components/games/MegaFruitsGame"));
const LionZamaGame = lazy(() => import("@/components/games/LionZamaGame"));

function GameContent({ gameId }: { gameId: string }) {
  const router = useRouter();
  const { user, updateBalance } = useAppStore();
  const balance = user?.balance ?? 0;

  const onBack = () => router.push("/");
  const onUpdateBalance = (newBal: number) => updateBalance(newBal);
  const onBet = (amount: number) => updateBalance(balance - amount);

  const gameProps = { balance, onUpdateBalance, onBack };
  const altProps = { balance, onClose: onBack, onBet };

  const loading = (
    <div className="min-h-screen bg-black flex items-center justify-center text-white">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Carregando jogo...</p>
      </div>
    </div>
  );

  return (
    <Suspense fallback={loading}>
      {gameId === "aviator" && <AviatorGame {...gameProps} />}
      {gameId === "taxi-crash" && <TaxiCrashGame {...gameProps} />}
      {gameId === "earplane" && <EarplaneGame {...gameProps} />}
      {gameId === "purple-crash" && <PurpleCrashGame {...gameProps} />}
      {gameId === "plinko" && <PlinkoGame {...gameProps} />}
      {gameId === "chicken-highway" && <ChickenHighwayGame {...altProps} />}
      {gameId === "augustus-crash" && <AugustusCrashGame {...altProps} />}
      {gameId === "bottle-mania" && <BottleManiaGame {...altProps} />}
      {gameId === "fishinator" && <FishinatorGame {...altProps} />}
      {gameId === "football-x" && <FootballXGame {...altProps} />}
      {gameId === "subway-crash" && <SubwayCrashGame {...altProps} />}
      {gameId === "mines" && <MinesGame {...altProps} />}
      {gameId === "mega-fruits" && <MegaFruitsGame {...gameProps} />}
      {gameId === "lion-zama" && <LionZamaGame {...gameProps} />}
    </Suspense>
  );
}

export default function PlayGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // No Next.js 16, params é async mas em client components usamos use()
  // Vamos usar uma abordagem simples com pathname
  const searchParams = useSearchParams();
  const gameId = typeof window !== "undefined" 
    ? window.location.pathname.split("/jogar/")[1]?.split("?")[0] 
    : "";

  if (!gameId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <p>Jogo não encontrado</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <GameContent gameId={gameId} />
    </div>
  );
}
