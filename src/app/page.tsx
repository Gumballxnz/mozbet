import dynamic from "next/dynamic";
import { Suspense } from "react";
import { supabaseAdmin } from "@/lib/auth-server";
import { LiveBetsTable } from "@/components/LiveBetsTable";
import { BannerCarousel } from "@/components/BannerCarousel";
import { AuthRedirectHandler } from "@/components/AuthRedirectHandler";

export const revalidate = 0;
export const dynamic = 'force-dynamic';

// Otimização Mobile: Code Splitting! O catálogo de jogos e suas dezenas de imagens 
// não bloqueiam o carregamento inicial da página (First Contentful Paint)
const GameCatalog = dynamic(() => import("@/components/GameCatalog").then(mod => mod.GameCatalog), {
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

      {/* Destaques Rápidos (Rendeizado 100% no Servidor) */}
      <section className="grid grid-cols-3 gap-2 px-3 py-4">
        {[
          { title: "Torneios", desc: "Prêmios Diários", icon: "🏆", bg: "from-amber-500/20 to-amber-600/5", border: "border-amber-500/20" },
          { title: "VIP", desc: "Cashback 20%", icon: "💎", bg: "from-purple-500/20 to-purple-600/5", border: "border-purple-500/20" },
          { title: "Indique", desc: "Ganhe 500 MT", icon: "🤝", bg: "from-emerald-500/20 to-emerald-600/5", border: "border-emerald-500/20" },
        ].map((item, i) => (
          <div key={i} className={`p-2 rounded-[16px] bg-gradient-to-br ${item.bg} border ${item.border} flex flex-col items-center justify-center text-center gap-1 active:scale-95 transition-transform`}>
            <span className="text-xl drop-shadow-md">{item.icon}</span>
            <div className="flex flex-col items-center">
              <h3 className="font-extrabold text-[10px] text-foreground/90 whitespace-nowrap">{item.title}</h3>
              <p className="text-[8px] font-bold text-muted-foreground whitespace-nowrap">{item.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Divisor de Destaque */}
      <div className="px-3 pb-2">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <GameCatalog />
      
      {/* Tabela de Apostas Ao Vivo */}
      <LiveBetsTable />
    </div>
  );
}
