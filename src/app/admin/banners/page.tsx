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
      // Auto-iniciar com dados reais e originais do Cloudinary para poupar trabalho manual
      const defaultBanners = [
        { 
          id: crypto.randomUUID(), 
          title: "Aviator", 
          highlight: "Ganhe Já", 
          description: "O Jogo de Explosão mais popular do Mundo. Voe alto e ganhe!", 
          badge: "HOT", 
          action_text: "Jogar", 
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
          action_text: "Apostar", 
          image_url: "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-plinko", 
          link_url: "/plinko", 
          sort_order: 2, 
          is_active: true 
        },
      ];
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
          <h1 className="text-2xl font-extrabold text-white">Central de Banners</h1>
          <p className="text-muted-foreground">Insira a URL original da imagem. O sistema criará um Proxy encriptado para os clientes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((banner) => (
            <div key={banner.id} className={`bg-surface p-6 rounded-2xl border ${banner.is_active ? 'border-white/10' : 'border-red-900/50 opacity-60'} flex flex-col xl:flex-row gap-6 shadow-xl relative transition-all`}>
              
              {/* Preview Vertical do Banner */}
              <div className="w-full xl:w-[200px] shrink-0 bg-black rounded-xl overflow-hidden aspect-[9/16] relative">
                {banner.image_url ? (
                  <>
                    <img src={banner.image_url} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 flex flex-col justify-end p-4">
                      <span className="text-[10px] bg-primary/20 text-primary border border-primary px-2 rounded-full w-fit mb-1">{banner.badge || "BADGE"}</span>
                      <h4 className="text-white font-black leading-tight text-lg">
                        {banner.title || "TÍTULO"}<br/>
                        <span className="text-primary">{banner.highlight || "DESTAQUE"}</span>
                      </h4>
                      <div className="mt-2 bg-primary text-black text-[10px] font-bold px-3 py-1 rounded w-fit">
                        {banner.action_text || "AÇÃO"}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">Sem Imagem</div>
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
                    <span className="text-sm font-bold text-white">Ativo</span>
                  </div>
                  <Button onClick={() => handleSave(banner)} className="bg-primary text-black font-extrabold hover:bg-primary/90">
                    Guardar no Servidor
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
    </div>
  );
}
