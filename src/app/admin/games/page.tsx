"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminGamesPage() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGames = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("sort_order", { ascending: true });
    
    if (data) setGames(data);
    if (error) toast.error("Erro ao carregar jogos");
    setLoading(false);
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleUpdate = async (id: string, field: string, value: any) => {
    setGames(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const handleSave = async (game: any) => {
    try {
      const res = await fetch("/api/admin/games", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(game),
      });

      if (!res.ok) throw new Error("Falha ao salvar");
      toast.success(`${game.name} atualizado com sucesso!`);
    } catch (err) {
      toast.error("Erro ao guardar as alterações");
    }
  };

  if (loading) {
    return <div className="text-white p-8">A carregar catálogo de jogos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Gestão do Catálogo de Jogos</h1>
          <p className="text-muted-foreground">Altera as capas dos jogos, ativa o selo HOT e gere as percentagens RTP.</p>
        </div>
        <Button onClick={() => setGames([...games, { id: crypto.randomUUID(), name: "Novo Jogo", banner_url: "/api/img/banner-aviator", category: "Crash", rtp_display: "97.0%", is_hot: false, is_active: true }])} className="bg-primary text-black font-extrabold">
          + Adicionar Jogo
        </Button>
      </div>

      {games.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-white/10 rounded-2xl bg-surface">
           <p className="text-gray-400 mb-4">O Catálogo de Jogos da Base de Dados está vazio.</p>
           <Button onClick={async () => {
              const { GAMES } = await import("@/lib/games");
              const dbGames = GAMES.map(g => ({
                id: g.id,
                name: g.name,
                banner_url: g.banner,
                category: g.categoryId,
                rtp_display: "97.5%",
                is_hot: g.hot || false,
                is_active: true
              }));
              setGames(dbGames);
           }} variant="outline" className="border-primary text-primary">
             Importar 14 Jogos Iniciais
           </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {games.map((game) => (
            <div key={game.id} className="bg-surface p-4 rounded-2xl border border-white/10 flex flex-col gap-4 relative">
              <Button onClick={() => setGames(games.filter(g => g.id !== game.id))} variant="destructive" size="icon" className="absolute top-2 right-2 w-6 h-6 z-10 rounded-full">
                x
              </Button>
              
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
                  <Input value={game.name} onChange={(e) => handleUpdate(game.id, "name", e.target.value)} className="bg-black h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400">URL da Imagem</label>
                  <Input value={game.banner_url} onChange={(e) => handleUpdate(game.id, "banner_url", e.target.value)} className="bg-black h-8 text-xs" />
                </div>
                
                <div className="flex gap-2">
                  <div className="space-y-1 flex-1">
                    <label className="text-xs font-bold text-gray-400">Categoria</label>
                    <Input value={game.category} onChange={(e) => handleUpdate(game.id, "category", e.target.value)} className="bg-black h-8 text-xs" />
                  </div>
                  <div className="space-y-1 w-20">
                    <label className="text-xs font-bold text-gray-400">RTP</label>
                    <Input value={game.rtp_display} onChange={(e) => handleUpdate(game.id, "rtp_display", e.target.value)} className="bg-black h-8 text-xs text-center" />
                  </div>
                </div>
  
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={game.is_hot} 
                      onCheckedChange={(c) => handleUpdate(game.id, "is_hot", c)} 
                    />
                    <span className="text-[10px] font-bold text-red-400">HOT</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={game.is_active !== false} 
                      onCheckedChange={(c) => handleUpdate(game.id, "is_active", c)} 
                    />
                    <span className="text-[10px] font-bold text-green-400">Visível</span>
                  </div>
                </div>
  
                <Button onClick={() => handleSave(game)} className="w-full mt-2 h-8 text-xs bg-primary text-black font-extrabold hover:bg-primary/90">
                  Salvar na BD
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
