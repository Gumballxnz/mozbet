import { Suspense } from "react";
import { supabaseAdmin } from "@/lib/auth-server";
import { LiveBetsTable } from "@/components/LiveBetsTable";
import { BannerCarousel } from "@/components/BannerCarousel";
import { AuthRedirectHandler } from "@/components/AuthRedirectHandler";
import { GameCatalog } from "@/components/GameCatalog";

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export default async function Home() {
  let initialBanners = [];
  let initialGames = [];
  try {
    const [bannersRes, gamesRes] = await Promise.all([
      supabaseAdmin
        .from("banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("games")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
    ]);

    if (bannersRes.data) {
      initialBanners = bannersRes.data;
    }
    if (gamesRes.data) {
      initialGames = gamesRes.data;
    }
  } catch (error) {
    console.error("Erro SSR Home:", error);
  }

  return (
    <div className="flex flex-col pb-4">
      {}
      <Suspense fallback={null}>
        <AuthRedirectHandler />
      </Suspense>

      {/* Navbar Superior (Específico Mobile) */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-muted-foreground">Bem-vindo à</span>
          <h1 className="text-2xl font-black text-foreground tracking-tight leading-none">MOZBET</h1>
        </div>
      </div>

      {/* Carrossel Dinâmico Client-side hidratado com dados do Servidor */}
      <BannerCarousel initialBanners={initialBanners} />

      <GameCatalog initialGames={initialGames} />

      {/* Tabela de Apostas Ao Vivo */}
      <LiveBetsTable />
    </div>
  );
}
