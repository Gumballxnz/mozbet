import { redirect } from "next/navigation";
import { GamePlayer } from "@/components/GamePlayer";
import { GAMES } from "@/lib/games";

// Mock das URLs dos jogos (Na fase de produção, estas virão do Provider oficial via API)
const GAME_URLS: Record<string, { demo: string; real: string }> = {
  "aviator": { 
    demo: "https://demo.spribe.io/launch/aviator", 
    real: "https://real.spribe.io/launch/aviator?token=MOZBET_TOKEN" 
  },
  "mines": { 
    demo: "https://demo.spribe.io/launch/mines", 
    real: "https://real.spribe.io/launch/mines?token=MOZBET_TOKEN" 
  },
  // Fallback genérico para os que não têm link de demo conhecido ainda
  "default": {
    demo: "https://frontend.turbogames.io/games/crash",
    real: "https://frontend.turbogames.io/games/crash"
  }
};

export default async function PlayGamePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const gameId = resolvedParams.id;
  const mode = resolvedSearchParams.mode === "real" ? "real" : "demo";

  // Verificar se o jogo existe no catálogo
  const game = GAMES.find((g) => g.id === gameId);
  
  if (!game) {
    redirect("/not-found");
  }

  // Obter URL do iframe
  const urls = GAME_URLS[gameId] || GAME_URLS["default"];
  const iframeUrl = mode === "real" ? urls.real : urls.demo;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col w-full h-[100dvh] overflow-hidden">
      <GamePlayer 
        gameName={game.name} 
        iframeUrl={iframeUrl} 
        mode={mode} 
        gameId={game.id} 
      />
    </div>
  );
}
