"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { Gamepad2, ChevronRight, Heart, LayoutGrid, Flame, Clock, Swords, Trophy, Cherry } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import NextImage from "next/image";
import { useAppStore } from "@/lib/store";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { playSound } from "@/lib/sounds";

export function GameCatalog({ initialGames = [] }: { initialGames?: any[] }) {
  const { t } = useTranslation();
  const { isLoggedIn, user } = useAppStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const catalogRef = useRef<HTMLDivElement>(null);

  const [games, setGames] = useState<any[]>(initialGames);
  const [featuredGames, setFeaturedGames] = useState<any[]>(
    initialGames.filter((g: any) => g.is_active !== false).slice(0, 6)
  );
  const [loading, setLoading] = useState(initialGames.length === 0);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    const category = searchParams.get("category");
    if (category) {
      setActiveFilter(category);

      catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      setActiveFilter("all");
    }
  }, [searchParams]);

  useEffect(() => {
    const activeGames = initialGames.filter((g: any) => g.is_active !== false);
    if (activeGames.length > 0) {
      const shuffled = [...activeGames].sort(() => 0.5 - Math.random());
      setFeaturedGames(shuffled.slice(0, 6));
    }
  }, [initialGames]);

  useEffect(() => {
    async function loadGames() {
      if (initialGames.length > 0) return;
      try {
        const res = await fetch("/api/content/games");
        const data = await res.json();

        if (data.games) {
          setGames(data.games);
          const activeGames = data.games.filter((g: any) => g.is_active !== false);
          const shuffled = [...activeGames].sort(() => 0.5 - Math.random());
          setFeaturedGames(shuffled.slice(0, 6));
        }
      } catch (err) {
        console.error("Erro ao carregar jogos:", err);
      } finally {
        setLoading(false);
      }
    }
    loadGames();
  }, [initialGames]);

  useEffect(() => {
    const channel = supabase.channel('public-games')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, async () => {
        const { data } = await supabase.from('games').select('*').order('sort_order', { ascending: true });
        if (data && data.length > 0) setGames(data);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleGameClick = (gameId: string) => {
    playSound('click');
    if (!isLoggedIn) {

      useAppStore.getState().openRegister();
      return;
    }

    const totalBalance = (user?.balance || 0) + (user?.bonusBalance || 0);
    if (!user?.isAdmin && totalBalance <= 0) {
      playSound('notification');
      toast.error("Saldo Insuficiente", {
        description: "Adicione saldo à sua conta para jogar.",
        action: {
          label: "Depositar",
          onClick: () => useAppStore.getState().setDepositOpen(true),
        },
        actionButtonStyle: {
          backgroundColor: "#00ff7f",
          color: "#000",
          fontWeight: "bold",
          padding: "10px 20px",
        }
      });
      return;
    }

    const isFreeAccessGame = gameId === "aviator" || gameId === "mines";
    if (!isFreeAccessGame && !user?.isAdmin && !user?.hasDeposited) {
      playSound('notification');
      toast.error("Depósito Necessário", {
        description: "Faça um depósito para ter acesso a este jogo.",
        action: {
          label: "Depositar",
          onClick: () => useAppStore.getState().setDepositOpen(true),
        },
        actionButtonStyle: {
          backgroundColor: "#00ff7f",
          color: "#000",
          fontWeight: "bold",
          padding: "10px 20px",
        }
      });
      return;
    }

    router.push(`/jogar/${gameId}`);
  };

  const filteredGames = games.filter(g => {
    if (g.is_active === false) return false;

    if (activeFilter === "all") return true;
    const cat = g.category?.toLowerCase() || "";
    if (activeFilter === "casino") return cat.includes("casino") || cat.includes("slot");
    if (activeFilter === "popular") return g.is_hot;
    if (activeFilter === "new") return g.is_new;
    return cat.includes(activeFilter);
  }).sort((a, b) => {

    if (a.is_hot && !b.is_hot) return -1;
    if (!a.is_hot && b.is_hot) return 1;

    return (a.sort_order || 99) - (b.sort_order || 99);
  });

  const filters = [
    { id: "all", label: "Todos os Jogos", icon: Gamepad2 },
    { id: "crash", label: "Crash Games", icon: Flame },
    { id: "casino", label: "Cassino", icon: LayoutGrid },
    { id: "slots", label: "Slots", icon: Cherry },
    { id: "popular", label: "Popular", icon: Flame },
  ];

  return (
    <div ref={catalogRef} className="px-3 pt-2 pb-6">
      {}
      {!loading && featuredGames.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {featuredGames.map((game) => (
            <button
              key={`featured-${game.id}`}
              onClick={() => handleGameClick(game.id)}
              className="relative rounded-[28px] overflow-hidden aspect-[4/5] group active:scale-[0.97] transition-all cursor-pointer text-left shadow-lg bg-card"
            >
              <NextImage
                src={game.banner_url}
                alt={game.name}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="absolute inset-0 w-full h-full object-cover"
              />

              {}
              {game.is_hot && (
                <div className="absolute top-0 left-0 w-20 h-20 overflow-hidden pointer-events-none z-10">
                  <div className="absolute top-3 -left-6 rotate-[-45deg] bg-red-600 text-white text-[11px] font-extrabold px-7 py-0.5 shadow-md">
                    HOT
                  </div>
                </div>
              )}

              {}
              <div className="absolute top-2 right-2 w-8 h-8 bg-black/80 rounded-lg flex items-center justify-center z-10 shadow-md">
                <Heart size={16} className="text-yellow-400" fill="none" />
              </div>

              {/* Percentagem RTP */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
                <span className="text-[9px] font-bold bg-black/80 text-white px-2 py-0.5 rounded shadow-sm">
                  {game.rtp_display}
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
      )}

      {/* Filtros em Barra Horizontal com Scroll */}
      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-4 -mx-3 px-3">
        {filters.map((filter) => {
          const Icon = filter.icon;
          const isActive = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-full text-sm font-bold transition-colors shrink-0 border ${
                isActive
                  ? "bg-primary/20 text-primary border-primary shadow-[0_0_15px_rgba(0,255,127,0.2)]"
                  : "bg-surface border-white/5 text-muted-foreground hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={16} className={isActive ? "text-primary" : "text-muted-foreground"} />
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Header da secção */}
      <div className="flex items-center justify-between mt-2 mb-3">
        <div className="flex items-center gap-2">
          <Gamepad2 size={20} className={activeFilter === "all" ? "text-primary" : "text-white"} />
          <h2 className="text-xl font-extrabold">
            {activeFilter === "all" ? "Jogos De Todos" : filters.find(f => f.id === activeFilter)?.label}
          </h2>
        </div>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          Ver Todos <ChevronRight size={14} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        /* Grid de jogos — estilo original */
        <div className="grid grid-cols-2 gap-3">
          {filteredGames.map((game) => (
            <button
              key={game.id}
              onClick={() => handleGameClick(game.id)}
              className="relative rounded-[28px] overflow-hidden aspect-[4/5] group active:scale-[0.97] transition-all cursor-pointer text-left shadow-lg bg-card"
            >
              <NextImage
                src={game.banner_url}
                alt={game.name}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Badge HOT */}
              {game.is_hot && (
                <div className="absolute top-0 left-0 w-20 h-20 overflow-hidden pointer-events-none z-10">
                  <div className="absolute top-3 -left-6 rotate-[-45deg] bg-red-600 text-white text-[11px] font-extrabold px-7 py-0.5 shadow-md">
                    HOT
                  </div>
                </div>
              )}

              {/* Botão de favorito */}
              <div className="absolute top-2 right-2 w-8 h-8 bg-black/80 rounded-lg flex items-center justify-center z-10 shadow-md">
                <Heart size={16} className="text-yellow-400" fill="none" />
              </div>

              {/* Percentagem RTP */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
                <span className="text-[9px] font-bold bg-black/80 text-white px-2 py-0.5 rounded shadow-sm">
                  {game.rtp_display}
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
      )}
    </div>
  );
}
