"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBanners = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .order("sort_order", { ascending: true });
    
    if (data && data.length > 0) {
      setBanners(data);
    } else {
      // Injetar Fisicamente os 5 Banners Originais na BD para resolver o problema permanentemente
      const defaultBanners = [
        { 
          id: crypto.randomUUID(), 
          title: "Aviator", 
          highlight: "Ganhe Já", 
          description: "O Jogo de Explosão mais popular do Mundo. Voe alto e ganhe!", 
          badge: "HOT", 
          action_text: "Jogar Agora", 
          image_url: "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-aviator", 
          link_url: "/aviator", 
          sort_order: 1, 
          is_active: true 
        },
        { 
          id: crypto.randomUUID(), 
          title: "Plinko", 
          highlight: "Multiplique", 
          description: "Deixe cair a bola e multiplique o seu dinheiro até 1000x.", 
          badge: "NOVO", 
          action_text: "Apostar Agora", 
          image_url: "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-plinko", 
          link_url: "/plinko", 
          sort_order: 2, 
          is_active: true 
        },
        { 
          id: crypto.randomUUID(), 
          title: "Mines", 
          highlight: "Cuidado com a Bomba", 
          description: "Quantas estrelas consegues encontrar antes da explosão?", 
          badge: "CLÁSSICO", 
          action_text: "Jogar Agora", 
          image_url: "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-mines", 
          link_url: "/mines", 
          sort_order: 3, 
          is_active: true 
        },
        { 
          id: crypto.randomUUID(), 
          title: "Fortune", 
          highlight: "Tiger", 
          description: "A sorte do tigre chegou a Moçambique. Ganha o super bónus!", 
          badge: "POPULAR", 
          action_text: "Tentar a Sorte", 
          image_url: "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-tiger", 
          link_url: "/tiger", 
          sort_order: 4, 
          is_active: true 
        },
        { 
          id: crypto.randomUUID(), 
          title: "Bónus VIP", 
          highlight: "20% Cashback", 
          description: "Junta-te ao clube de jogadores VIP e recebe dinheiro de volta todas as semanas.", 
          badge: "EXCLUSIVO", 
          action_text: "Ver Regras", 
          image_url: "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-vip", 
          link_url: "/vip", 
          sort_order: 5, 
          is_active: true 
        }
      ];
      // Apenas popular a UI visualmente para ele editar e gravar se quiser.
      setBanners(defaultBanners);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleUpdate = async (id: string, field: string, value: any) => {
    setBanners(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const handleSave = async (banner: any) => {
    try {
      const res = await fetch("/api/admin/banners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(banner),
      });

      if (!res.ok) throw new Error("Falha ao salvar");
      toast.success("Banner atualizado com sucesso!");
    } catch (err) {
      toast.error("Erro ao guardar as alterações");
    }
  };

  if (loading) {
    return <div className="text-white p-8">A sincronizar sistema de banners...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Carrossel de Destaques</h1>
          <p className="text-muted-foreground">Insira a URL original da imagem. O sistema criará um Proxy encriptado para os clientes.</p>
        </div>
        <Button onClick={() => setBanners([...banners, { id: crypto.randomUUID(), title: "", highlight: "", description: "", badge: "", action_text: "", image_url: "", link_url: "", sort_order: banners.length + 1, is_active: true }])} className="bg-primary text-black font-extrabold">
          + Adicionar Banner
        </Button>
      </div>

      <div className="flex flex-col gap-6">
          {banners.map((banner) => (
            <div key={banner.id} className={`bg-surface p-6 rounded-2xl border ${banner.is_active ? 'border-white/10' : 'border-red-900/50 opacity-60'} flex flex-col lg:flex-row gap-6 shadow-xl relative transition-all`}>
              
              {/* Preview Horizontal do Banner */}
              <div className="w-full lg:w-[450px] shrink-0 bg-black rounded-xl overflow-hidden aspect-[21/9] relative border border-white/5">
                {banner.image_url ? (
                  <>
                    <img src={banner.image_url} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 flex flex-col justify-center p-6 bg-gradient-to-r from-black/80 to-transparent">
                      <span className="text-[10px] bg-primary/20 text-primary border border-primary px-2 py-0.5 rounded-full w-fit mb-2 font-black tracking-widest">{banner.badge || "BADGE"}</span>
                      <h4 className="text-white font-black leading-tight text-2xl drop-shadow-md">
                        {banner.title || "TÍTULO"} <span className="text-primary">{banner.highlight || "DESTAQUE"}</span>
                      </h4>
                      <p className="text-xs text-gray-300 mt-1 max-w-[200px] drop-shadow">{banner.description}</p>
                      <div className="mt-4 bg-primary text-black text-xs font-bold px-4 py-1.5 rounded-md w-fit shadow-md">
                        {banner.action_text || "AÇÃO"}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">Sem Imagem (URL Vazia)</div>
                )}
              </div>

              {/* Formulário Desktop */}
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-bold text-gray-400">URL da Imagem</label>
                    <Input value={banner.image_url || ''} onChange={(e) => handleUpdate(banner.id, "image_url", e.target.value)} className="bg-black h-9" />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400">Título Principal</label>
                    <Input value={banner.title || ''} onChange={(e) => handleUpdate(banner.id, "title", e.target.value)} className="bg-black h-9" />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400">Destaque (Verde)</label>
                    <Input value={banner.highlight || ''} onChange={(e) => handleUpdate(banner.id, "highlight", e.target.value)} className="bg-black h-9" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400">Badge (Etiqueta)</label>
                    <Input value={banner.badge || ''} onChange={(e) => handleUpdate(banner.id, "badge", e.target.value)} className="bg-black h-9" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400">Texto do Botão</label>
                    <Input value={banner.action_text || ''} onChange={(e) => handleUpdate(banner.id, "action_text", e.target.value)} className="bg-black h-9" />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-bold text-gray-400">Descrição Menor</label>
                    <Input value={banner.description || ''} onChange={(e) => handleUpdate(banner.id, "description", e.target.value)} className="bg-black h-9" />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-auto">
                  <div className="flex items-center gap-2">
                    <Switch checked={banner.is_active !== false} onCheckedChange={(c) => handleUpdate(banner.id, "is_active", c)} />
                    <span className="text-sm font-bold text-white">Ativo (Visível)</span>
                  </div>
                  <Button onClick={() => handleSave(banner)} className="bg-primary text-black font-extrabold hover:bg-primary/90">
                    Guardar Alterações
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
    </div>
  );
}
