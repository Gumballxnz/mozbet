"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { useAppStore } from "@/lib/store";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Button } from "@/components/ui/button";

// Otimização Mobile: Code Splitting! O catálogo de jogos e suas dezenas de imagens 
// não bloqueiam o carregamento inicial da página (First Contentful Paint)
const GameCatalog = dynamic(() => import("@/components/GameCatalog").then(mod => mod.GameCatalog), {
  loading: () => (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
      <p className="text-muted-foreground animate-pulse">A carregar jogos...</p>
    </div>
  ),
  ssr: true, // Renderiza a estrutura no servidor para SEO
});

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

const SLIDES = [
  {
    id: 1,
    image: "/assets/banner-promo.jpg",
    badge: "NOVO JOGADOR",
    title: "BÔNUS DE ",
    highlight: "500%",
    desc: "Registe-se agora e ganhe até 25.000 MT no seu primeiro depósito para jogar Aviator, Mines e muito mais.",
    action: "RESGATAR BÔNUS",
  },
  {
    id: 2,
    image: "/assets/banner-aviator.jpg",
    badge: "O MAIS QUERIDO",
    title: "VOE COM O ",
    highlight: "AVIATOR",
    desc: "O jogo que está a fazer milionários em Moçambique. Levante o dinheiro antes que o avião fuja!",
    action: "JOGAR AVIATOR",
  },
  {
    id: 3,
    image: "/assets/banner-mines.jpg",
    badge: "CLÁSSICO",
    title: "EXPLOSÃO DE ",
    highlight: "GANHOS",
    desc: "Cuidado com as minas! Quanto mais estrelas revelar, maior é o multiplicador. Pode sacar a qualquer momento.",
    action: "JOGAR MINES",
  },
  {
    id: 4,
    image: "/assets/banner-plinko.jpg",
    badge: "CASINO",
    title: "A BOLA DA ",
    highlight: "SORTE",
    desc: "Deixe a bola cair e veja a magia acontecer. Multiplicadores gigantescos à sua espera no fundo.",
    action: "JOGAR PLINKO",
  },
  {
    id: 5,
    image: "/assets/banner-taxi.jpg",
    badge: "NOVIDADE",
    title: "O TAXI DA ",
    highlight: "FORTUNA",
    desc: "Apanhe o chapa e multiplique o seu saldo na viagem! Exclusivo na MOZBET.",
    action: "JOGAR TAXI",
  }
];

export default function HomePage() {
  const { t } = useTranslation();
  const { setRegisterOpen, isLoggedIn } = useAppStore();
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get("category") || null;
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full">
      {/* Carrossel de Banners Promocionais */}
      <section className="relative w-full aspect-[21/9] sm:aspect-[21/6] md:aspect-[21/5] max-h-[400px] bg-surface-elevated overflow-hidden group">
        {SLIDES.map((slide, index) => (
          <div 
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              className="object-cover opacity-60 sm:opacity-80 transition-transform duration-[6000ms] ease-out scale-100 group-hover:scale-105"
              priority={index === 0}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
            
            <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-12 max-w-2xl">
              <span className="inline-block px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-full text-xs font-bold mb-3 w-max glow-primary">
                {slide.badge}
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2 text-white">
                {slide.title} <span className="text-primary glow-primary">{slide.highlight}</span>
              </h1>
              <p className="text-sm md:text-lg text-muted-foreground mb-6 max-w-[80%]">
                {slide.desc}
              </p>
              
              {!isLoggedIn && (
                <Button 
                  size="lg" 
                  className="w-max px-8 font-bold text-lg shadow-[0_0_20px_rgba(0,255,127,0.4)] animate-pulse-glow"
                  onClick={() => setRegisterOpen(true)}
                >
                  {slide.action}
                </Button>
              )}
            </div>
          </div>
        ))}
        
        {/* Indicadores do Carrossel (Dots) */}
        <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                idx === currentSlide ? "bg-primary w-8" : "bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      </section>

      {/* Catálogo de Jogos */}
      <section className="px-4 py-8 max-w-7xl mx-auto">
        <GameCatalog categoryFilter={categoryFilter} />
      </section>
    </div>
  );
}
