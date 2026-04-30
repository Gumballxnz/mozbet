"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { Gamepad2, Coins, Cherry, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { GAMES } from "@/lib/games";

import { useRouter } from "next/navigation";

export function GameCatalog({ categoryFilter }: { categoryFilter?: string | null }) {
  const { t } = useTranslation();
  const { isLoggedIn } = useAppStore();
  const router = useRouter();

  // Se existe um filtro de categoria, mostrar apenas essa
  if (categoryFilter && ["crash", "casino", "slots"].includes(categoryFilter)) {
    const filtered = GAMES.filter((g) => g.category === categoryFilter);
    const titles: Record<string, { icon: any; label: string }> = {
      crash: { icon: Zap, label: "Crash Games" },
      casino: { icon: Coins, label: "Casino" },
      slots: { icon: Cherry, label: "Slots" },
    };
    const cat = titles[categoryFilter];

    return (
      <div className="space-y-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <cat.icon className="text-primary w-5 h-5" />
              {cat.label}
            </h2>
            <span className="text-xs text-muted-foreground">{filtered.length} jogos</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {filtered.map((game) => (
              <GameCard key={game.id} game={game} isLoggedIn={isLoggedIn} router={router} t={t} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Sem filtro — mostrar todas as categorias
  return (
    <div className="space-y-8">
      {/* Crash Games */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="text-primary w-5 h-5" />
            Crash Games
          </h2>
          <Button variant="link" className="text-muted-foreground text-sm p-0 h-auto">
            {t("viewAll")}
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {GAMES.filter((g) => g.category === "crash").map((game) => (
            <GameCard key={game.id} game={game} isLoggedIn={isLoggedIn} router={router} t={t} />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Coins className="text-primary w-5 h-5" />
            {t("casino")}
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {GAMES.filter((g) => g.category === "casino").map((game) => (
            <GameCard key={game.id} game={game} isLoggedIn={isLoggedIn} router={router} t={t} />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Cherry className="text-primary w-5 h-5" />
            Slots
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {GAMES.filter((g) => g.category === "slots").map((game) => (
            <GameCard key={game.id} game={game} isLoggedIn={isLoggedIn} router={router} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}

function GameCard({ 
  game, 
  isLoggedIn,
  router,
  t 
}: { 
  game: typeof GAMES[0], 
  isLoggedIn: boolean,
  router: any,
  t: any
}) {
  const handleCardClick = () => {
    if (!isLoggedIn) {
      router.push(`/jogar/${game.id}?mode=demo`);
    } else {
      router.push(`/jogar/${game.id}?mode=real`);
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className="group relative rounded-xl overflow-hidden bg-surface-elevated border border-border aspect-[4/5] flex flex-col transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(0,255,127,0.15)] cursor-pointer"
    >
      <Image
        src={game.banner}
        alt={game.name}
        fill
        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
        className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
      
      <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col gap-2 transform md:translate-y-2 md:group-hover:translate-y-0 transition-transform">
        <h3 className="font-bold text-sm text-white truncate drop-shadow-md">
          {game.name}
        </h3>
        
        {/* Se NÃO estiver logado: Apenas DEMO. No desktop fica invisível até hover, no mobile fica opaco (opacity-80) para dar dica */}
        {!isLoggedIn && (
          <div className="flex opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <div className="w-full flex items-center justify-center h-8 text-[10px] bg-black/60 backdrop-blur-md rounded-md text-white font-bold border border-white/20 uppercase">
              {t("demoMode")}
            </div>
          </div>
        )}

        {/* Se ESTIVER logado: No mobile, tap no card joga REAL. No desktop, mostramos botões. */}
        {isLoggedIn && (
          <div className="hidden md:flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              size="sm" 
              className="flex-1 h-8 text-[10px] bg-primary text-black font-extrabold px-0 hover:bg-primary/90"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/jogar/${game.id}?mode=real`);
              }}
            >
              {t("realMode")}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 h-8 text-[10px] bg-black/50 backdrop-blur-sm px-0 text-white border-white/20 hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/jogar/${game.id}?mode=demo`);
              }}
            >
              {t("demoMode")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
