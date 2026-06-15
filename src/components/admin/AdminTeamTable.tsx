"use client";

import { useState } from "react";
import { Search, ShieldAlert, UserCheck, ShieldCheck, UserPlus, Trash2, ArrowDownCircle, AtSign, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface TeamMember {
  id: string;
  phone: string;
  email?: string | null;
  username: string;
  created_at: string;
  is_active: boolean;
  is_admin: boolean;
  role: 'super_admin' | 'admin' | 'user';
}

export function AdminTeamTable({ initialTeam, currentUserRole, currentUserId }: { initialTeam: TeamMember[]; currentUserRole: string; currentUserId: string }) {
  const [team, setTeam] = useState<TeamMember[]>(initialTeam);
  const [search, setSearch] = useState("");
  
  // Modais de ação
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  // Estados de Busca para Promoção
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const executeAction = async (action: 'promote' | 'promote_owner' | 'demote' | 'delete', userId: string) => {
    try {
      toast.loading("A processar cargo...", { id: "admin-team-action" });
      const res = await fetch("/api/admin/users/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao executar ação de equipa");

      toast.success(data.message || "Ação de equipa concluída com sucesso.", { id: "admin-team-action" });

      if (action === 'delete' || action === 'demote') {
        // Remove da equipe local
        setTeam(prev => prev.filter(m => m.id !== userId));
      } else {
        // Se promoveu, busca os dados atualizados do membro promovido
        const { data: updatedUser } = await supabase
          .from("users")
          .select("id, phone, email, username, created_at, is_active, is_admin, role")
          .eq("id", userId)
          .single();

        if (updatedUser) {
          setTeam(prev => {
            const exists = prev.some(m => m.id === userId);
            if (exists) {
              return prev.map(m => m.id === userId ? (updatedUser as TeamMember) : m);
            } else {
              return [...prev, updatedUser as TeamMember];
            }
          });
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao executar ação de equipa", { id: "admin-team-action" });
    }
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, phone, email, username")
        .or(`id.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err: any) {
      toast.error("Erro ao procurar jogadores: " + err.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const filteredTeam = team.filter(m => 
    m.username.toLowerCase().includes(search.toLowerCase()) ||
    m.phone.includes(search) ||
    m.id.includes(search) ||
    (m.email && m.email.toLowerCase().includes(search.toLowerCase()))
  );

  const isOwner = currentUserRole === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-primary" />
            Gestão de Equipa
          </h1>
          <p className="text-muted-foreground">Listagem e controlo de cargos administrativos e proprietários da plataforma.</p>
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold tracking-wider uppercase">
            Membros da Equipa: {team.length}
          </div>
        </div>

        {isOwner && (
          <Button 
            onClick={() => {
              setSearchQuery("");
              setSearchResults([]);
              setPromoteModalOpen(true);
            }}
            className="bg-primary text-black font-extrabold flex items-center gap-2 hover:bg-primary/95 shadow-lg shadow-primary/20 h-11 px-5"
          >
            <UserPlus className="w-5 h-5" />
            Promover Novo Membro
          </Button>
        )}
      </div>

      {/* Tabela de Equipa Desktop */}
      <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl overflow-hidden shadow-xl hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-gray-500 uppercase bg-[#0B0C10] border-b border-[#2A2F40] font-black tracking-wider">
              <tr>
                <th className="px-6 py-4">Membro (ID Completo)</th>
                <th className="px-6 py-4">Utilizador / Username</th>
                <th className="px-6 py-4">Contacto Bancário / Telefone</th>
                <th className="px-6 py-4">E-mail</th>
                <th className="px-6 py-4">Cargo</th>
                <th className="px-6 py-4">Data de Criação</th>
                {isOwner && <th className="px-6 py-4 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filteredTeam.map((member) => (
                <tr key={member.id} className="border-b border-[#2A2F40]/50 hover:bg-[#1A1D27] transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-primary font-bold select-all align-middle">
                    {member.id}
                  </td>
                  <td className="px-6 py-4 font-bold text-white align-middle">
                    {member.username}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-gray-300 align-middle">
                    +{member.phone}
                  </td>
                  <td className="px-6 py-4 font-mono text-sky-400 align-middle">
                    {member.email || "Sem e-mail registado"}
                  </td>
                  <td className="px-6 py-4 align-middle">
                    {member.role === 'super_admin' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        Proprietário (Dono)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
                        Administrador
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 font-mono align-middle">
                    {new Date(member.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  {isOwner && (
                    <td className="px-6 py-4 text-right align-middle">
                      <div className="flex justify-end gap-2">
                        {member.id !== currentUserId && (
                          <>
                            <Button
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: "Despromover Membro de Equipa",
                                  description: `Deseja remover os cargos administrativos de ${member.username}? A conta voltará a ser de um utilizador comum.`,
                                  onConfirm: () => executeAction('demote', member.id)
                                });
                              }}
                              variant="outline"
                              size="sm"
                              className="border-[#2A2F40] bg-[#1A1D27] hover:bg-orange-500/20 hover:text-orange-400 hover:border-orange-500/30 font-bold text-xs h-8"
                            >
                              <ArrowDownCircle className="w-3.5 h-3.5 mr-1" /> Rebaixar
                            </Button>

                            <Button
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: "Apagar Ficha de Admin",
                                  description: `Deseja deletar permanentemente a conta e os dados de ${member.username}? Esta ação é irreversível.`,
                                  onConfirm: () => executeAction('delete', member.id)
                                });
                              }}
                              variant="destructive"
                              size="sm"
                              className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white font-bold text-xs h-8 border border-red-500/20"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {filteredTeam.length === 0 && (
                <tr>
                  <td colSpan={isOwner ? 7 : 6} className="px-6 py-12 text-center text-muted-foreground font-medium">
                    Nenhum membro administrativo encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards de Equipa Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
        {filteredTeam.map((member) => (
          <div key={member.id} className="bg-[#101116] border border-[#2A2F40]/60 rounded-2xl p-4 space-y-3 shadow-md text-left text-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-bold text-white text-base block">{member.username}</span>
                <span className="text-xs text-gray-500 font-mono select-all block">{member.id}</span>
              </div>
              <div>
                {member.role === 'super_admin' ? (
                  <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-purple-500/20 text-purple-400 border border-purple-500/30">Dono</span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-primary/20 text-primary border border-primary/30">Admin</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2A2F40]/30 text-xs">
              <div>
                <span className="text-gray-500 block">Telefone</span>
                <span className="font-mono font-bold text-white">+{member.phone}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Membro Desde</span>
                <span className="text-gray-300 font-medium">{new Date(member.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            {member.email && (
              <div className="text-xs font-mono text-sky-400 pt-1">
                {member.email}
              </div>
            )}

            {isOwner && member.id !== currentUserId && (
              <div className="flex justify-end gap-2 pt-2 border-t border-[#2A2F40]/30">
                <Button
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: "Despromover Membro de Equipa",
                      description: `Deseja remover os cargos administrativos de ${member.username}?`,
                      onConfirm: () => executeAction('demote', member.id)
                    });
                  }}
                  variant="outline"
                  size="sm"
                  className="border-[#2A2F40] bg-[#1A1D27] hover:bg-orange-500/20 hover:text-orange-400 font-bold text-xs h-8 cursor-pointer"
                >
                  <ArrowDownCircle className="w-3.5 h-3.5 mr-1" /> Rebaixar
                </Button>
                <Button
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: "Apagar Ficha de Admin",
                      description: `Deseja deletar permanentemente a conta de ${member.username}?`,
                      onConfirm: () => executeAction('delete', member.id)
                    });
                  }}
                  variant="destructive"
                  size="sm"
                  className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white font-bold text-xs h-8 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MODAL DE PROMOÇÃO DE MEMBROS */}
      <Dialog open={promoteModalOpen} onOpenChange={setPromoteModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-[#101116] border-[#2A2F40] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-primary" />
              Promover Jogador para Equipa
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs">Procure pelo ID completo, e-mail ou número de telefone para promover.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="flex gap-2">
              <Input
                placeholder="ex: ID, 84xxxxxxx ou email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchUsers()}
                className="bg-black border-[#2A2F40]"
              />
              <Button onClick={handleSearchUsers} disabled={searchLoading} className="bg-primary text-black font-bold">
                {searchLoading ? "A procurar..." : "Pesquisar"}
              </Button>
            </div>

            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {searchResults.map((user) => (
                <div key={user.id} className="bg-[#0B0C10] border border-[#2A2F40] p-3 rounded-xl flex items-center justify-between text-xs gap-3">
                  <div className="flex flex-col gap-1 text-left min-w-0">
                    <span className="font-bold text-white truncate">{user.username || "Sem Nome"}</span>
                    <span className="font-mono text-gray-400 select-all font-bold text-[10px]">{user.id}</span>
                    <span className="font-mono text-[10px] text-gray-500">+{user.phone} {user.email ? `| ${user.email}` : ""}</span>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      onClick={() => {
                        executeAction('promote', user.id);
                        setPromoteModalOpen(false);
                      }}
                      size="sm"
                      className="bg-primary/20 hover:bg-primary hover:text-black text-primary font-bold text-[10px] h-8 px-2.5"
                    >
                      Promover Admin
                    </Button>
                    <Button
                      onClick={() => {
                        executeAction('promote_owner', user.id);
                        setPromoteModalOpen(false);
                      }}
                      size="sm"
                      className="bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/30 font-bold text-[10px] h-8 px-2.5"
                    >
                      Tornar Dono
                    </Button>
                  </div>
                </div>
              ))}

              {searchResults.length === 0 && searchQuery && !searchLoading && (
                <div className="text-center text-gray-500 py-6 text-xs">
                  Nenhum utilizador encontrado com esta busca.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAÇÃO DE AÇÕES */}
      <Dialog open={!!confirmModal?.isOpen} onOpenChange={(open) => !open && setConfirmModal(null)}>
        <DialogContent className="sm:max-w-[400px] bg-[#141516] border border-[#2A2F40]/50 text-white rounded-3xl p-6 shadow-2xl">
          <DialogTitle className="text-lg font-black text-white uppercase tracking-wider">
            {confirmModal?.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400 mt-2 leading-relaxed">
            {confirmModal?.description}
          </DialogDescription>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setConfirmModal(null)}
              className="bg-[#1A1C24] hover:bg-white/5 border-[#2A2F40] text-gray-300 hover:text-white rounded-xl h-11 px-4 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                confirmModal?.onConfirm();
                setConfirmModal(null);
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-black rounded-xl h-11 px-5 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
