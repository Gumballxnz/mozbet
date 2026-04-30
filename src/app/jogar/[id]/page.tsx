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

import { LiveStatsTicker } from "@/components/LiveStatsTicker";

function GameContent({ gameId, isDemo }: { gameId: string, isDemo: boolean }) {
  const router = useRouter();
  const { user, updateBalance, setRegisterOpen } = useAppStore();
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

  if (isDemo) {
    const demoUrl = gameId === "aviator" 
      ? "https://demo.spribe.io/launch/aviator"
      : gameId === "mines"
        ? "https://demo.spribe.io/launch/mines"
        : "https://frontend.turbogames.io/games/crash";

    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="h-12 bg-surface border-b border-white/5 flex items-center justify-between px-4">
          <button onClick={onBack} className="text-white hover:text-primary p-2">
            Voltar
          </button>
          <div className="flex gap-2">
            <span className="text-primary font-bold px-3 py-1 bg-primary/10 rounded-full text-xs">MODO DEMO</span>
            <button 
              onClick={() => { onBack(); setRegisterOpen(true); }}
              className="bg-primary text-black font-bold px-3 py-1 rounded-lg text-sm"
            >
              Jogar a Dinheiro Real
            </button>
          </div>
        </div>
        <iframe 
          src={demoUrl} 
          className="w-full flex-1 border-none"
          allow="autoplay; fullscreen"
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <LiveStatsTicker />
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
    </div>
  );
}

import { use } from "react";

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

  if (!gameId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <p>Jogo não encontrado</p>
      </div>
    );
  }

  return <GameContent gameId={gameId} isDemo={isDemo} />;
}
