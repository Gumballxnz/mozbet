"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { Gamepad2, ChevronRight, Heart } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { GAMES } from "@/lib/games";

export function GameCatalog() {
  const { t } = useTranslation();
  const { isLoggedIn } = useAppStore();
  const router = useRouter();

  const handleGameClick = (gameId: string) => {
    if (!isLoggedIn) {
      router.push(`/jogar/${gameId}?mode=demo`);
    } else {
      router.push(`/jogar/${gameId}?mode=real`);
    }
  };

  return (
    <div className="px-3 pt-2 pb-6">
      {/* Header da secção */}
      <div className="flex items-center justify-between mt-2 mb-3">
        <div className="flex items-center gap-2">
          <Gamepad2 size={20} className="text-primary" />
          <h2 className="text-xl font-extrabold">{t("games")}</h2>
        </div>
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          Ver Todos <ChevronRight size={14} />
        </button>
      </div>

      {/* Grid de jogos — estilo original */}
      <div className="grid grid-cols-2 gap-3">
        {GAMES.map((game) => (
          <button
            key={game.id}
            onClick={() => handleGameClick(game.id)}
            className="relative rounded-[28px] overflow-hidden aspect-[4/5] group active:scale-[0.97] transition-all cursor-pointer text-left shadow-lg bg-card"
          >
            <Image
              src={game.banner}
              alt={game.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover"
            />

            {/* Badge HOT */}
            {game.hot && (
              <div className="absolute top-0 left-0 w-20 h-20 overflow-hidden pointer-events-none z-10">
                <div className="absolute top-3 -left-6 rotate-[-45deg] bg-red-600 text-white text-[11px] font-extrabold px-7 py-0.5 shadow-md">
                  HOT
                </div>
              </div>
            )}

            {/* Botão de favorito */}
            <div className="absolute top-2 right-2 w-8 h-8 bg-black/70 rounded-lg flex items-center justify-center backdrop-blur-sm z-10">
              <Heart size={16} className="text-yellow-400" fill="none" />
            </div>

            {/* Percentagem RTP */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
              <span className="text-[9px] font-bold bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded">
                {game.pct}
              </span>
            </div>

            {/* Nome do jogo */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pt-8 pb-3 px-2">
              <p className="text-center text-base font-extrabold text-white tracking-wider drop-shadow-lg">
                {game.name}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
