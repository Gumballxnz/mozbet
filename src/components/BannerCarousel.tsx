"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Banner {
  id: string;
  title: string;
  highlight: string;
  description: string;
  badge: string;
  action_text: string;
  image_url: string;
}

export function BannerCarousel({ initialBanners }: { initialBanners: Banner[] }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [banners, setBanners] = useState<Banner[]>(initialBanners);

  // Se initialBanners vier vazio por alguma falha do SSR, tenta carregar no client
  useEffect(() => {
    if (initialBanners.length === 0) {
      async function loadBanners() {
        try {
          const res = await fetch("/api/content/banners");
          const data = await res.json();
          if (data.banners) setBanners(data.banners);
        } catch (err) {}
      }
      loadBanners();
    }
  }, [initialBanners]);

  // Realtime Supabase Banners
  useEffect(() => {
    const channel = supabase.channel('public-banners')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, async () => {
        // Quando alterado no CRM, puxa de novo os banners ativos
        const { data } = await supabase.from('banners').select('*').order('sort_order', { ascending: true });
        if (data && data.length > 0) setBanners(data);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) {
    return (
      <section className="relative w-[calc(100%-24px)] mx-3 mt-3 aspect-[21/11] sm:aspect-[21/6] max-h-[400px] rounded-[28px] overflow-hidden group bg-surface-elevated">
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/20">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-[calc(100%-24px)] mx-3 mt-3 aspect-[21/11] sm:aspect-[21/6] max-h-[400px] rounded-[28px] overflow-hidden group bg-surface-elevated">
      <style>{`
        @keyframes fillProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
      
      {banners.map((slide, index) => (
        <div 
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          <img
            src={slide.image_url?.startsWith("http") ? `/api/proxy-image?url=${encodeURIComponent(slide.image_url)}` : slide.image_url}
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
      ))}

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
  );
}
