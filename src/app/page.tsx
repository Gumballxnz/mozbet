"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { useAppStore } from "@/lib/store";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LiveBetsTable } from "@/components/LiveBetsTable";

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

export default function Home() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const { openLogin } = useAppStore();
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [banners, setBanners] = useState<any[]>([]);

  // Carregar Banners dinamicamente da API interna
  useEffect(() => {
    async function loadBanners() {
      try {
        const res = await fetch("/api/content/banners");
        const data = await res.json();
        
        if (data.banners && data.banners.length > 0) {
          setBanners(data.banners);
        }
      } catch (err) {
        console.error("Erro ao carregar banners:", err);
      }
    }
    loadBanners();
  }, []);

  // Animação do carrossel
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  // Se houver redirect via URL, abre o modal de login (segurança)
  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "unauthorized") {
      openLogin();
    }
  }, [searchParams, openLogin]);

  return (
    <div className="flex flex-col pb-4">
      <style>{`
        @keyframes fillProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
      {/* Navbar Superior (Específico Mobile) */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-muted-foreground">Bem-vindo à</span>
          <h1 className="text-2xl font-black text-foreground tracking-tight leading-none">MOZBET</h1>
        </div>
      </div>

      {/* Carrossel de Banners Promocionais Dinâmicos */}
      <section className="relative w-[calc(100%-24px)] mx-3 mt-3 aspect-[21/11] sm:aspect-[21/6] max-h-[400px] rounded-[28px] overflow-hidden group bg-surface-elevated">
        {banners.length > 0 ? (
          banners.map((slide, index) => (
            <div 
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
            >
              <img
                src={slide.image_url}
                alt={slide.title}
                className="absolute inset-0 w-full h-full object-cover opacity-60 sm:opacity-80 transition-transform duration-[6000ms] ease-out scale-100 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
              
              <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-12 z-20">
                <span className="inline-block w-fit px-3 py-1 rounded-full bg-primary/20 border border-primary/50 text-primary text-[10px] font-extrabold tracking-widest uppercase mb-3 shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                  {slide.badge}
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-white leading-[1.1] tracking-tight mb-2 drop-shadow-md">
                  {slide.title} <br className="sm:hidden" />
                  <span className="text-primary">{slide.highlight}</span>
                </h2>
                <p className="text-xs sm:text-base text-gray-300 max-w-[200px] sm:max-w-md font-medium leading-relaxed drop-shadow">
                  {slide.description}
                </p>
                <div className="mt-5">
                  <button className="h-10 px-6 rounded-xl bg-primary text-primary-foreground font-extrabold text-sm shadow-[0_4px_0_0_hsl(var(--primary-dark))] active:translate-y-1 active:shadow-none transition-all">
                    {slide.action_text}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/20">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {/* Indicadores do carrossel */}
        {banners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`rounded-full h-1.5 overflow-hidden transition-all duration-300 ${
                  i === currentSlide ? "w-6 bg-black/50 border border-white/10" : "w-1.5 bg-white/30 hover:bg-white/50"
                }`}
              >
                {i === currentSlide && (
                  <div 
                    className="h-full bg-primary" 
                    style={{ animation: "fillProgress 5s linear forwards" }} 
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Destaques Rápidos */}
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
