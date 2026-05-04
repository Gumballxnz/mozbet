"use client";

import { use, useEffect, useState, Suspense, lazy } from "react";

// Lazy loading para garantir que o cliente só descarrega O jogo específico.
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

export default function GameEnginePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const gameId = resolvedParams.id;

  // Estado Local (no Iframe) sincronizado com o PAI
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    // Dizer ao site Pai que acordamos
    window.parent.postMessage({ type: 'ENGINE_READY' }, '*');

    // Ouvir mensagens do site Pai
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'SYNC_BALANCE') {
        setBalance(e.data.balance);
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Callbacks para os jogos
  const onUpdateBalance = (newBal: number) => {
    setBalance(newBal); // Optimistic UI
    // Avisar o PAI para ele fazer update global e sincronizar BD
    window.parent.postMessage({ type: 'UPDATE_BALANCE', balance: newBal }, '*');
  };

  const onBet = (amount: number) => {
    const newBal = balance - amount;
    setBalance(newBal);
    window.parent.postMessage({ type: 'UPDATE_BALANCE', balance: newBal }, '*');
  };

  const onBack = () => {
    window.parent.postMessage({ type: 'CLOSE_GAME' }, '*');
  };

  const gameProps = { balance, onUpdateBalance, onBack };
  const altProps = { balance, onClose: onBack, onBet };

  const loading = (
    <div className="min-h-screen bg-black flex items-center justify-center text-white">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black w-full overflow-hidden fixed inset-0">
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
