"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Lock, Loader2 } from "lucide-react";

const CDN = "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet";

interface GameData {
  id: string;
  name: string;
  banner_url: string;
  category: string;
  rtp_display: string;
  is_hot: boolean;
  is_active: boolean;
  sort_order?: number;
}

export default function AdminGamesPage() {
  const [games, setGames] = useState<GameData[]>([]);
  const [originals, setOriginals] = useState<Record<string, GameData>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGames = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("games")
      .select("*")
      .order("sort_order", { ascending: true });
    
    if (data && data.length > 0) {
      setGames(data);
      const origMap: Record<string, GameData> = {};
      data.forEach(g => { origMap[g.id] = { ...g }; });
      setOriginals(origMap);
    } else {
      // Auto-populate do ficheiro hardcoded se BD vazia
      const { GAMES } = await import("@/lib/games");
      const dbGames: GameData[] = GAMES.map((g, i) => ({
        id: g.id,
        name: g.name,
        banner_url: g.banner,
        category: g.category,
        rtp_display: g.pct || "97.5%",
        is_hot: g.hot || false,
        is_active: true,
        sort_order: i + 1,
      }));
      setGames(dbGames);
      const origMap: Record<string, GameData> = {};
      dbGames.forEach(g => { origMap[g.id] = { ...g }; });
      setOriginals(origMap);
    }
    setLoading(false);
  };

  useEffect(() => { fetchGames(); }, []);

  const handleUpdate = (id: string, field: string, value: any) => {
    setGames(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  // Verifica se houve alteração real num jogo específico
  const hasChanges = useCallback((game: GameData): boolean => {
    const orig = originals[game.id];
    if (!orig) return true; // Novo jogo, nunca gravado
    return (
      orig.name !== game.name ||
      orig.banner_url !== game.banner_url ||
      orig.category !== game.category ||
      orig.rtp_display !== game.rtp_display ||
      orig.is_hot !== game.is_hot ||
      orig.is_active !== game.is_active
    );
  }, [originals]);

  const handleSave = async (game: GameData) => {
    setSavingId(game.id);
    try {
      const res = await fetch("/api/admin/games", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(game),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Falha ao salvar");
      }
      toast.success(`${game.name} atualizado com sucesso!`);
      // Atualizar a cópia original
      setOriginals(prev => ({ ...prev, [game.id]: { ...game } }));
      setEditingId(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao guardar as alterações");
    } finally {
      setSavingId(null);
    }
  };

  const handleCancelEdit = (gameId: string) => {
    const orig = originals[gameId];
    if (orig) {
      setGames(prev => prev.map(g => g.id === gameId ? { ...orig } : g));
    }
    setEditingId(null);
  };

  if (loading) {
    return <div className="text-white p-8 flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin" /> A sincronizar catálogo de jogos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Gestão do Catálogo de Jogos</h1>
          <p className="text-muted-foreground">Clique em <Pencil className="w-3 h-3 inline" /> para editar. Botão de Guardar só aparece com alterações reais.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {games.map((game) => {
          const isEditing = editingId === game.id;
          const changed = hasChanges(game);
          const isSaving = savingId === game.id;

          return (
            <div key={game.id} className={`bg-surface p-4 rounded-2xl border ${game.is_active ? 'border-white/10' : 'border-red-900/50 opacity-60'} ${isEditing ? 'ring-2 ring-primary/50' : ''} flex flex-col gap-4 relative transition-all`}>
              
              {/* Botão Editar / Cancelar */}
              <div className="flex justify-end">
                {!isEditing ? (
                  <button 
                    onClick={() => setEditingId(game.id)}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-primary/70 hover:text-primary transition-colors"
                  >
                    <Pencil className="w-3 h-3" /> Editar
                  </button>
                ) : (
                  <button 
                    onClick={() => handleCancelEdit(game.id)}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-red-400/70 hover:text-red-400 transition-colors"
                  >
                    <Lock className="w-3 h-3" /> Cancelar
                  </button>
                )}
              </div>

              {/* Preview da Capa */}
              <div className="relative aspect-[4/5] rounded-xl overflow-hidden w-full max-w-[150px] mx-auto shadow-xl">
                <img src={game.banner_url} alt={game.name} className="absolute inset-0 w-full h-full object-cover" />
                {game.is_hot && (
                  <div className="absolute top-3 -left-6 rotate-[-45deg] bg-red-600 text-white text-[10px] font-extrabold px-7 py-0.5 shadow-md">
                    HOT
                  </div>
                )}
                <div className="absolute top-2 left-1/2 -translate-x-1/2">
                  <span className="text-[10px] font-bold bg-black/80 text-white px-2 py-0.5 rounded">{game.rtp_display}</span>
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent pt-6 pb-2 px-2 text-center">
                  <span className="text-sm font-extrabold text-white">{game.name}</span>
                </div>
              </div>
  
              {/* Formulário */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400">Nome do Jogo / ID</label>
                  <Input value={game.name} onChange={(e) => handleUpdate(game.id, "name", e.target.value)} className="bg-black h-8 text-xs" disabled={!isEditing} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400">URL da Imagem</label>
                  <Input value={game.banner_url} onChange={(e) => handleUpdate(game.id, "banner_url", e.target.value)} className="bg-black h-8 text-xs" disabled={!isEditing} />
                </div>
                
                <div className="flex gap-2">
                  <div className="space-y-1 flex-1">
                    <label className="text-xs font-bold text-gray-400">Categoria</label>
                    <Input value={game.category} onChange={(e) => handleUpdate(game.id, "category", e.target.value)} className="bg-black h-8 text-xs" disabled={!isEditing} />
                  </div>
                  <div className="space-y-1 w-20">
                    <label className="text-xs font-bold text-gray-400">RTP</label>
                    <Input value={game.rtp_display} onChange={(e) => handleUpdate(game.id, "rtp_display", e.target.value)} className="bg-black h-8 text-xs text-center" disabled={!isEditing} />
                  </div>
                </div>
  
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={game.is_hot} 
                      onCheckedChange={(c) => handleUpdate(game.id, "is_hot", c)} 
                      disabled={!isEditing}
                    />
                    <span className="text-[10px] font-bold text-red-400">HOT</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={game.is_active !== false} 
                      onCheckedChange={(c) => handleUpdate(game.id, "is_active", c)} 
                      disabled={!isEditing}
                    />
                    <span className="text-[10px] font-bold text-green-400">Visível</span>
                  </div>
                </div>
  
                {isEditing && (
                  <Button 
                    onClick={() => handleSave(game)} 
                    disabled={!changed || isSaving}
                    className="w-full mt-2 h-8 text-xs bg-primary text-black font-extrabold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed gap-2"
                  >
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {isSaving ? "A Gravar..." : changed ? "Salvar na BD" : "Sem Alterações"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
