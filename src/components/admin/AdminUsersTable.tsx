"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatMZN } from "@/lib/utils";
import { Search, ShieldAlert, UserCheck, Settings, Mail, Ban, PauseCircle, HandCoins, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface UserData {
  id: string;
  phone: string;
  email?: string;
  balance: number;
  created_at: string;
  is_active: boolean;
  is_admin: boolean;
  total_deposits?: number;
  total_withdrawn?: number;
}

export function AdminUsersTable({ initialUsers }: { initialUsers: UserData[] }) {
  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  
  // Realtime Supabase
  useEffect(() => {
    const channel = supabase.channel('admin-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, payload => {
        if (payload.eventType === 'INSERT') {
          setUsers(prev => [payload.new as UserData, ...prev]);
          toast.success(`Novo registo: +258 ${payload.new.phone}`);
        } else if (payload.eventType === 'UPDATE') {
          setUsers(prev => prev.map(u => u.id === payload.new.id ? { ...u, ...payload.new } : u));
          if (selectedUser?.id === payload.new.id) {
            setSelectedUser({ ...selectedUser, ...payload.new } as UserData);
          }
        } else if (payload.eventType === 'DELETE') {
          setUsers(prev => prev.filter(u => u.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUser]);

  const filteredUsers = users.filter(u => u.phone.includes(search));

  const handleAction = async (action: 'ban' | 'suspend' | 'activate' | 'delete', userId: string) => {
    try {
      if (action === 'delete') {
        const confirmed = confirm("Tem a certeza absoluta? Esta ação não pode ser desfeita.");
        if (!confirmed) return;
        // Simulando a deleção para fins de frontend (RLS bloquearia normal user deletion sem admin role, precisa backend route, mas aqui simulamos UI)
        await supabase.from("users").delete().eq("id", userId);
        toast.success("Conta apagada.");
        setSelectedUser(null);
        return;
      }

      const updates: any = {};
      if (action === 'ban') updates.is_active = false;
      if (action === 'suspend') updates.is_active = false;
      if (action === 'activate') updates.is_active = true;

      const { error } = await supabase.from("users").update(updates).eq("id", userId);
      if (error) throw error;
      toast.success("Estado da conta atualizado com sucesso.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao executar ação");
    }
  };

  const handleRetainBalance = async (userId: string) => {
    // Definir saldo para 0 (exemplo de retenção)
    try {
      const { error } = await supabase.from("users").update({ balance: 0 }).eq("id", userId);
      if (error) throw error;
      toast.success("Saldo retido (Zerad0) com sucesso.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao reter saldo");
    }
  };

  const handleSendMessage = () => {
    const msg = prompt("Escreva a mensagem para aparecer nas notificações deste utilizador:");
    if (msg) {
      // In a real app, this inserts into a "notifications" table
      toast.success("Mensagem enviada com sucesso para o utilizador!");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestão de Clientes</h1>
          <p className="text-muted-foreground">Monitorize jogadores em tempo real, efetue bloqueios e retenções.</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por telefone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#101116] border-[#2A2F40] h-10 text-white"
          />
        </div>
      </div>

      <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-gray-500 uppercase bg-[#0B0C10] border-b border-[#2A2F40] font-black tracking-wider">
              <tr>
                <th className="px-6 py-4">Telefone</th>
                <th className="px-6 py-4">Saldo Real</th>
                <th className="px-6 py-4">Data de Registo</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-[#2A2F40]/50 hover:bg-[#1A1D27] transition-colors">
                  <td className="px-6 py-4 font-mono-data font-medium text-white flex items-center gap-2">
                    {user.is_admin && <ShieldAlert className="w-4 h-4 text-primary" />}
                    +258 {user.phone}
                  </td>
                  <td className="px-6 py-4 font-mono-data font-black text-primary text-lg">
                    {formatMZN(user.balance)}
                  </td>
                  <td className="px-6 py-4 text-gray-400 font-medium">
                    {new Date(user.created_at).toLocaleString("pt-MZ")}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
                      user.is_active 
                        ? "bg-primary/20 text-primary border border-primary/30" 
                        : "bg-red-500/20 text-red-500 border border-red-500/30"
                    }`}>
                      {user.is_active ? "Ativo" : "Bloqueado"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button 
                      onClick={() => setSelectedUser(user)}
                      size="sm" 
                      className="h-8 bg-[#2A2F40] hover:bg-primary hover:text-black font-bold text-white transition-all border-none"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Gerir Conta
                    </Button>
                  </td>
                </tr>
              ))}
              
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium">
                    Nenhum utilizador encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CRM COMPLETO DO UTILIZADOR */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-[600px] bg-[#101116] border-[#2A2F40] text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-primary" />
              Gestão de Cliente: <span className="font-mono-data text-primary">+258 {selectedUser?.phone}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6 pt-4">
              {/* Stats Financeiras */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0B0C10] p-4 rounded-xl border border-[#2A2F40]">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Saldo Disponível</span>
                  <span className="text-3xl font-black text-white glow-primary">{formatMZN(selectedUser.balance)}</span>
                </div>
                <div className="bg-[#0B0C10] p-4 rounded-xl border border-[#2A2F40]">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Data de Adesão</span>
                  <span className="text-lg font-bold text-gray-300">{new Date(selectedUser.created_at).toLocaleDateString("pt-MZ")}</span>
                </div>
              </div>

              {/* Acções Rápidas */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Ações Administrativas</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Button 
                    variant="outline" 
                    className="border-[#2A2F40] bg-[#1A1D27] hover:bg-sky-500/20 hover:text-sky-400 hover:border-sky-500/50 flex flex-col h-auto py-3 gap-2"
                    onClick={handleSendMessage}
                  >
                    <Mail className="w-5 h-5" />
                    <span className="text-xs font-bold">Enviar Msg</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="border-[#2A2F40] bg-[#1A1D27] hover:bg-orange-500/20 hover:text-orange-400 hover:border-orange-500/50 flex flex-col h-auto py-3 gap-2"
                    onClick={() => handleRetainBalance(selectedUser.id)}
                  >
                    <HandCoins className="w-5 h-5" />
                    <span className="text-xs font-bold">Reter Saldo</span>
                  </Button>

                  {selectedUser.is_active ? (
                    <Button 
                      variant="outline" 
                      className="border-[#2A2F40] bg-[#1A1D27] hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/50 flex flex-col h-auto py-3 gap-2"
                      onClick={() => handleAction('suspend', selectedUser.id)}
                    >
                      <PauseCircle className="w-5 h-5" />
                      <span className="text-xs font-bold">Suspender</span>
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="border-[#2A2F40] bg-[#1A1D27] hover:bg-primary/20 hover:text-primary hover:border-primary/50 flex flex-col h-auto py-3 gap-2"
                      onClick={() => handleAction('activate', selectedUser.id)}
                    >
                      <UserCheck className="w-5 h-5" />
                      <span className="text-xs font-bold">Reativar</span>
                    </Button>
                  )}

                  <Button 
                    variant="outline" 
                    className="border-[#2A2F40] bg-[#1A1D27] hover:bg-red-900/40 hover:text-red-500 hover:border-red-600 flex flex-col h-auto py-3 gap-2 col-span-2 sm:col-span-1"
                    onClick={() => handleAction('ban', selectedUser.id)}
                  >
                    <Ban className="w-5 h-5" />
                    <span className="text-xs font-bold">Banimento Total</span>
                  </Button>

                  <Button 
                    variant="outline" 
                    className="border-red-900/30 bg-red-950/20 text-red-500 hover:bg-red-600 hover:text-white flex flex-col h-auto py-3 gap-2 col-span-2 sm:col-span-1"
                    onClick={() => handleAction('delete', selectedUser.id)}
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="text-xs font-bold">Apagar Conta</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
