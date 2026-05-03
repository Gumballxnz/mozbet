import nextDynamic from "next/dynamic";
import { Suspense } from "react";
import { supabaseAdmin } from "@/lib/auth-server";
import { LiveBetsTable } from "@/components/LiveBetsTable";
import { BannerCarousel } from "@/components/BannerCarousel";
import { AuthRedirectHandler } from "@/components/AuthRedirectHandler";

export const revalidate = 0;
export const dynamic = 'force-dynamic';

// Otimização Mobile: Code Splitting! O catálogo de jogos e suas dezenas de imagens 
// não bloqueiam o carregamento inicial da página (First Contentful Paint)
const GameCatalog = nextDynamic(() => import("@/components/GameCatalog").then(mod => mod.GameCatalog), {
  loading: () => (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
      <p className="text-muted-foreground animate-pulse">A carregar jogos...</p>
    </div>
  ),
  ssr: true,
});

// A Home agora é um Server Component! 
// Isso significa zero JavaScript carregado instantaneamente, renderização quase imediata.
export default async function Home() {
  // Fetch direto da base de dados no Servidor, sem overhead de API HTTP
  let initialBanners = [];
  try {
    const { data } = await supabaseAdmin
      .from("banners")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    
    if (data) {
      initialBanners = data;
    }
  } catch (error) {
    console.error("Erro SSR Banners:", error);
  }

  return (
    <div className="flex flex-col pb-4">
      {/* Lida com redirects e ?error=unauthorized no Client */}
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

      <GameCatalog />
      
      {/* Tabela de Apostas Ao Vivo */}
      <LiveBetsTable />
    </div>
  );
}
