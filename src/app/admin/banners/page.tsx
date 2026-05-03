"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Lock, Loader2 } from "lucide-react";



interface BannerData {
  id: string;
  title: string;
  highlight: string;
  description: string;
  badge: string;
  action_text: string;
  image_url: string;
  link_url: string;
  sort_order: number;
  is_active: boolean;
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [originals, setOriginals] = useState<Record<string, BannerData>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/content/banners");
      const { banners: data } = await res.json();
      
      if (data && data.length > 0) {
        setBanners(data);
        const origMap: Record<string, BannerData> = {};
        data.forEach((b: BannerData) => { origMap[b.id] = { ...b }; });
        setOriginals(origMap);
      } else {
        setBanners([]);
        setOriginals({});
      }
    } catch (err) {
      console.error("Erro ao carregar banners:", err);
      setBanners([]);
      setOriginals({});
    }
    setLoading(false);
  };

  useEffect(() => { fetchBanners(); }, []);

  const handleUpdate = (id: string, field: string, value: any) => {
    setBanners(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  // Verifica se houve alteração real num banner específico
  const hasChanges = useCallback((banner: BannerData): boolean => {
    const orig = originals[banner.id];
    if (!orig) return true; // Novo banner, nunca gravado
    return (
      orig.title !== banner.title ||
      orig.highlight !== banner.highlight ||
      orig.description !== banner.description ||
      orig.badge !== banner.badge ||
      orig.action_text !== banner.action_text ||
      orig.image_url !== banner.image_url ||
      orig.link_url !== banner.link_url ||
      orig.is_active !== banner.is_active
    );
  }, [originals]);

  const handleSave = async (banner: BannerData) => {
    setSavingId(banner.id);
    try {
      const res = await fetch("/api/admin/banners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(banner),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Falha ao salvar");
      }
      toast.success("Banner atualizado com sucesso!");
      // Atualizar a cópia original para refletir o novo estado gravado
      setOriginals(prev => ({ ...prev, [banner.id]: { ...banner } }));
      setEditingId(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao guardar as alterações");
    } finally {
      setSavingId(null);
    }
  };

  const handleCancelEdit = (bannerId: string) => {
    // Reverter para os dados originais
    const orig = originals[bannerId];
    if (orig) {
      setBanners(prev => prev.map(b => b.id === bannerId ? { ...orig } : b));
    }
    setEditingId(null);
  };

  if (loading) {
    return <div className="text-white p-8 flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin" /> A sincronizar sistema de banners...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Carrossel de Destaques</h1>
          <p className="text-muted-foreground">Clique em <Pencil className="w-3 h-3 inline" /> para editar. Alterações só são gravadas ao clicar em Guardar.</p>
        </div>
        <Button onClick={() => {
          const newBanner: BannerData = { id: crypto.randomUUID(), title: "", highlight: "", description: "", badge: "", action_text: "", image_url: "", link_url: "", sort_order: banners.length + 1, is_active: true };
          setBanners([...banners, newBanner]);
          setEditingId(newBanner.id);
        }} className="bg-primary text-black font-extrabold">
          + Adicionar Banner
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        {banners.map((banner) => {
          const isEditing = editingId === banner.id;
          const changed = hasChanges(banner);
          const isSaving = savingId === banner.id;

          return (
            <div key={banner.id} className={`bg-surface p-6 rounded-2xl border ${banner.is_active ? 'border-white/10' : 'border-red-900/50 opacity-60'} ${isEditing ? 'ring-2 ring-primary/50' : ''} flex flex-col lg:flex-row gap-6 shadow-xl relative transition-all`}>
              
              {/* Preview Horizontal do Banner */}
              <div className="w-full lg:w-[450px] shrink-0 bg-black rounded-xl overflow-hidden aspect-[21/9] relative border border-white/5">
                {banner.image_url ? (
                  <>
                    <img 
                      src={banner.image_url} 
                      alt="Preview" 
                      className="absolute inset-0 w-full h-full object-cover opacity-60" 
                    />
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
                {/* Botão de Editar / Bloquear */}
                <div className="flex justify-end">
                  {!isEditing ? (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setEditingId(banner.id)}
                      className="border-primary/30 text-primary hover:bg-primary/20 gap-2"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Editar Dados
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleCancelEdit(banner.id)}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/20 gap-2"
                    >
                      <Lock className="w-3.5 h-3.5" /> Cancelar Edição
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-bold text-gray-400">URL da Imagem</label>
                    <Input value={banner.image_url || ''} onChange={(e) => handleUpdate(banner.id, "image_url", e.target.value)} className="bg-black h-9" disabled={!isEditing} />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400">Título Principal</label>
                    <Input value={banner.title || ''} onChange={(e) => handleUpdate(banner.id, "title", e.target.value)} className="bg-black h-9" disabled={!isEditing} />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400">Destaque (Verde)</label>
                    <Input value={banner.highlight || ''} onChange={(e) => handleUpdate(banner.id, "highlight", e.target.value)} className="bg-black h-9" disabled={!isEditing} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400">Badge (Etiqueta)</label>
                    <Input value={banner.badge || ''} onChange={(e) => handleUpdate(banner.id, "badge", e.target.value)} className="bg-black h-9" disabled={!isEditing} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400">Texto do Botão</label>
                    <Input value={banner.action_text || ''} onChange={(e) => handleUpdate(banner.id, "action_text", e.target.value)} className="bg-black h-9" disabled={!isEditing} />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-bold text-gray-400">Descrição Menor</label>
                    <Input value={banner.description || ''} onChange={(e) => handleUpdate(banner.id, "description", e.target.value)} className="bg-black h-9" disabled={!isEditing} />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-auto">
                  <div className="flex items-center gap-2">
                    <Switch checked={banner.is_active !== false} onCheckedChange={(c) => handleUpdate(banner.id, "is_active", c)} disabled={!isEditing} />
                    <span className="text-sm font-bold text-white">Ativo (Visível)</span>
                  </div>
                  
                  {isEditing && (
                    <Button 
                      onClick={() => handleSave(banner)} 
                      disabled={!changed || isSaving}
                      className="bg-primary text-black font-extrabold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed gap-2"
                    >
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isSaving ? "A Gravar..." : changed ? "Guardar Alterações" : "Sem Alterações"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
