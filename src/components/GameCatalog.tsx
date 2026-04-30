"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { Gamepad2, Coins, Cherry, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { GAMES } from "@/lib/games";

export function GameCatalog({ categoryFilter }: { categoryFilter?: string | null }) {
  const { t } = useTranslation();
  const { setRegisterOpen, isLoggedIn } = useAppStore();

  const handleGameClick = (e: React.MouseEvent, type: "real" | "demo") => {
    if (type === "real" && !isLoggedIn) {
      e.preventDefault();
      setRegisterOpen(true);
    }
  };

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
              <GameCard key={game.id} game={game} onClick={handleGameClick} t={t} />
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
            <GameCard key={game.id} game={game} onClick={handleGameClick} t={t} />
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
            <GameCard key={game.id} game={game} onClick={handleGameClick} t={t} />
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
            <GameCard key={game.id} game={game} onClick={handleGameClick} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}

function GameCard({ 
  game, 
  onClick, 
  t 
}: { 
  game: typeof GAMES[0], 
  onClick: (e: React.MouseEvent, type: "real" | "demo") => void,
  t: any
}) {
  return (
    <div className="group relative rounded-xl overflow-hidden bg-surface-elevated border border-border aspect-[4/5] flex flex-col transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(0,255,127,0.15)]">
      <Image
        src={game.banner}
        alt={game.name}
        fill
        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
        className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      
      <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform">
        <h3 className="font-bold text-sm text-white truncate drop-shadow-md">
          {game.name}
        </h3>
        
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link 
            href={`/jogar/${game.id}?mode=real`}
            className="flex-1"
            onClick={(e) => onClick(e, "real")}
          >
            <Button size="sm" className="w-full h-8 text-[10px] bg-primary text-black font-extrabold px-0">
              {t("realMode")}
            </Button>
          </Link>
          <Link 
            href={`/jogar/${game.id}?mode=demo`}
            className="flex-1"
            onClick={(e) => onClick(e, "demo")}
          >
            <Button variant="outline" size="sm" className="w-full h-8 text-[10px] bg-black/50 backdrop-blur-sm px-0 text-white border-white/20">
              {t("demoMode")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
