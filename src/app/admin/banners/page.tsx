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
      // Auto-iniciar com placeholders se estiver vazio
      setBanners([
        { id: crypto.randomUUID(), image_url: "https://via.placeholder.com/800x400/0B0C10/FF0000?text=Banner+Original+1", link_url: "/aviator", sort_order: 1, is_active: true },
        { id: crypto.randomUUID(), image_url: "https://via.placeholder.com/800x400/0B0C10/00FF00?text=Banner+Original+2", link_url: "/plinko", sort_order: 2, is_active: true },
      ]);
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
        <Button onClick={() => setBanners([...banners, { id: crypto.randomUUID(), image_url: "", link_url: "", sort_order: banners.length + 1, is_active: true }])} className="bg-primary text-black font-extrabold">
          + Adicionar Banner
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((banner) => (
            <div key={banner.id} className="bg-surface p-6 rounded-2xl border border-white/10 flex flex-col xl:flex-row gap-6 shadow-xl relative">
              <Button onClick={() => setBanners(banners.filter(b => b.id !== banner.id))} variant="destructive" size="sm" className="absolute top-4 right-4 z-10">
                Remover
              </Button>
              
              {/* Preview do Banner */}
              <div className="w-full xl:w-1/3 relative aspect-[21/9] rounded-xl overflow-hidden flex-shrink-0 border border-white/10 bg-black">
                <img src={banner.image_url} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Preview" />
                <div className="absolute inset-0 bg-gradient-to-r from-background to-transparent" />
                <div className="absolute inset-0 p-4 flex flex-col justify-center">
                  <span className="text-[8px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/50 w-fit mb-1">{banner.badge}</span>
                  <h3 className="text-xl font-black text-white leading-tight">
                    {banner.title} <span className="text-primary">{banner.highlight}</span>
                  </h3>
                  <p className="text-[10px] text-gray-300 max-w-[200px] truncate">{banner.description}</p>
                  <button className="mt-2 text-[10px] bg-primary text-black px-3 py-1 rounded font-bold w-fit">{banner.action_text}</button>
                </div>
              </div>
  
              {/* Formulário de Edição */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400">URL da Imagem</label>
                  <Input value={banner.image_url} onChange={(e) => handleUpdate(banner.id, "image_url", e.target.value)} className="bg-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400">Badge (Etiqueta)</label>
                  <Input value={banner.badge} onChange={(e) => handleUpdate(banner.id, "badge", e.target.value)} className="bg-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400">Título Principal</label>
                  <Input value={banner.title} onChange={(e) => handleUpdate(banner.id, "title", e.target.value)} className="bg-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400">Destaque (Verde)</label>
                  <Input value={banner.highlight} onChange={(e) => handleUpdate(banner.id, "highlight", e.target.value)} className="bg-black" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-400">Descrição Menor</label>
                  <Input value={banner.description} onChange={(e) => handleUpdate(banner.id, "description", e.target.value)} className="bg-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400">Texto do Botão</label>
                  <Input value={banner.action_text} onChange={(e) => handleUpdate(banner.id, "action_text", e.target.value)} className="bg-black" />
                </div>
                
                <div className="md:col-span-2 flex items-center justify-between pt-4 border-t border-white/10 mt-2">
                  <div className="flex items-center gap-3">
                    <Switch 
                      checked={banner.is_active !== false} 
                      onCheckedChange={(c) => handleUpdate(banner.id, "is_active", c)} 
                    />
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
      )}
    </div>
  );
}
