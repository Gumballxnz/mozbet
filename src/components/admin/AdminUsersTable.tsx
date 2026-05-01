"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatMZN } from "@/lib/utils";
import { Search, ShieldAlert, UserCheck, Settings, Mail, Ban, PauseCircle, HandCoins, Trash2, Megaphone, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface UserData {
  id: string;
  phone: string;
  email?: string;
  balance: number;
  balance_retained?: boolean;
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
  const [globalModalOpen, setGlobalModalOpen] = useState(false);
  
  // Realtime Supabase
  useEffect(() => {
    const channel = supabase.channel('admin-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, payload => {
        if (payload.eventType === 'INSERT') {
          setUsers(prev => [payload.new as UserData, ...prev]);
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

  const filteredUsers = users.filter(u => u.phone.includes(search) || (u.email && u.email.includes(search)));

  const handleAction = async (action: 'ban' | 'suspend' | 'activate' | 'delete', userId: string) => {
    try {
      if (action === 'delete') {
        const confirmed = confirm("Aviso: Apagar este utilizador removerá todos os seus dados e não tem volta. Continuar?");
        if (!confirmed) return;
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

  const handleRetainBalance = async (userId: string, currentStatus?: boolean) => {
    try {
      const { error } = await supabase.from("users").update({ balance_retained: !currentStatus }).eq("id", userId);
      if (error) throw error;
      toast.success(!currentStatus ? "Saldo Bloqueado com sucesso. O cliente não pode jogar nem levantar." : "Saldo desbloqueado!");
    } catch (err: any) {
      toast.error("Erro ao reter saldo. (Verifique se executou o SQL de adição de coluna balance_retained)");
    }
  };

  const handleSendSiteMessage = async (userId: string | "GLOBAL") => {
    const msg = prompt(`Escreva a mensagem (Notificação no site) para ${userId === 'GLOBAL' ? 'TODOS OS UTILIZADORES' : 'este utilizador'}:`);
    if (!msg) return;
    
    toast.loading("A processar e enviar mensagem...", { id: "msg" });
    try {
      if (userId === "GLOBAL") {
        // Enviar para todos os ativos no site através de broadcast ou criar inserção massiva na db (notifications)
        const { error } = await supabase.from('notifications').insert({ user_id: 'global', message: msg, type: 'alert' });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('notifications').insert({ user_id: userId, message: msg, type: 'alert' });
        if (error) throw error;
      }
      toast.success(`Mensagem entregue com sucesso! O ponto vermelho aparecerá instantaneamente.`, { id: "msg" });
    } catch (e) {
      toast.error("Erro a enviar. Tem a tabela 'notifications' criada no Supabase SQL?", { id: "msg" });
    }
  };

  const handleSendEmail = async (userId: string | "GLOBAL") => {
    const subject = prompt("Assunto do E-mail:");
    if (!subject) return;
    const body = prompt("Conteúdo do E-mail:");
    if (!body) return;

    toast.loading(userId === 'GLOBAL' ? "A agendar disparo global de emails (via Resend)..." : "A enviar email individual...", { id: "email" });
    
    try {
      const payload = { target: userId, subject, body };
      const response = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error("Falha no disparo.");
      
      const data = await response.json();
      toast.success(userId === "GLOBAL" ? `${data.message}` : `E-mail entregue com sucesso!`, { id: "email" });
      setGlobalModalOpen(false);
    } catch (error) {
      toast.error("Falha no sistema de e-mails. Verifique se o RESEND_API_KEY está no .env", { id: "email" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestão de Clientes</h1>
          <p className="text-muted-foreground">Monitorize em tempo real, efetue bloqueios e dispare comunicações.</p>
        </div>
        
        <div className="flex w-full sm:w-auto items-center gap-3">
          <Button 
            onClick={() => setGlobalModalOpen(true)}
            className="bg-primary/20 text-primary border border-primary/50 font-bold hidden md:flex"
          >
            <Megaphone className="w-4 h-4 mr-2" /> Comunicação Global
          </Button>
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Telefone ou e-mail..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#101116] border-[#2A2F40] h-10 text-white"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-gray-500 uppercase bg-[#0B0C10] border-b border-[#2A2F40] font-black tracking-wider">
              <tr>
                <th className="px-6 py-4">Telefone</th>
                <th className="px-6 py-4">Saldo Real</th>
                <th className="px-6 py-4">Status / Bloqueios</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-[#2A2F40]/50 hover:bg-[#1A1D27] transition-colors">
                  <td className="px-6 py-4 font-mono-data font-medium text-white flex flex-col gap-1">
                    <span className="flex items-center gap-2">
                      {user.is_admin && <ShieldAlert className="w-4 h-4 text-primary" />}
                      +258 {user.phone}
                    </span>
                    {user.email && <span className="text-[10px] text-gray-500 font-sans">{user.email}</span>}
                  </td>
                  <td className="px-6 py-4 font-mono-data font-black text-primary text-lg">
                    {formatMZN(user.balance)}
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      user.is_active ? "bg-primary/20 text-primary border border-primary/30" : "bg-red-500/20 text-red-500 border border-red-500/30"
                    }`}>
                      {user.is_active ? "Ativo" : "Banido"}
                    </span>
                    {user.balance_retained && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-500 border border-orange-500/30">
                        Saldo Retido
                      </span>
                    )}
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
        <DialogContent className="sm:max-w-[650px] bg-[#101116] border-[#2A2F40] text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-primary" />
              Gestão Financeira: <span className="font-mono-data text-primary">+258 {selectedUser?.phone}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6 pt-4">
              
              {selectedUser.email && (
                 <div className="bg-sky-900/20 border border-sky-500/30 p-3 rounded-xl flex items-center gap-3">
                   <Mail className="w-5 h-5 text-sky-400" />
                   <span className="text-sm font-bold text-sky-100">{selectedUser.email}</span>
                 </div>
              )}

              {/* Stats Financeiras (Simulando depósitos/perdas via BD completa no backend, mostramos UI) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`col-span-2 p-4 rounded-xl border ${selectedUser.balance_retained ? 'bg-orange-950/40 border-orange-500/50' : 'bg-[#0B0C10] border-[#2A2F40]'}`}>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Saldo em Caixa</span>
                  <span className={`text-3xl font-black ${selectedUser.balance_retained ? 'text-orange-500' : 'text-white glow-primary'}`}>{formatMZN(selectedUser.balance)}</span>
                  {selectedUser.balance_retained && <span className="text-[10px] font-bold text-orange-400 mt-1 block">BLOQUEADO. UTILIZADOR NÃO PODE MOVER FUNDOS.</span>}
                </div>
                <div className="bg-[#0B0C10] p-4 rounded-xl border border-[#2A2F40] flex flex-col justify-center">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Depósitos Totais</span>
                  <span className="text-lg font-bold text-gray-300">{formatMZN(selectedUser.total_deposits || 0)}</span>
                </div>
                <div className="bg-[#0B0C10] p-4 rounded-xl border border-[#2A2F40] flex flex-col justify-center">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Levantamentos</span>
                  <span className="text-lg font-bold text-red-400">{formatMZN(selectedUser.total_withdrawn || 0)}</span>
                </div>
              </div>

              {/* Acções Rápidas */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Comunicações (Realtime)</h3>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <Button 
                    variant="outline" 
                    className="border-[#2A2F40] bg-[#1A1D27] hover:bg-primary/20 hover:text-primary flex items-center justify-center py-6 gap-3"
                    onClick={() => handleSendSiteMessage(selectedUser.id)}
                  >
                    <Send className="w-5 h-5 text-primary" />
                    <span className="text-sm font-bold">Alertar via Website (Notificação)</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    disabled={!selectedUser.email}
                    className="border-[#2A2F40] bg-[#1A1D27] hover:bg-sky-500/20 hover:text-sky-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center py-6 gap-3"
                    onClick={() => handleSendEmail(selectedUser.id)}
                  >
                    <Mail className="w-5 h-5 text-sky-400" />
                    <span className="text-sm font-bold">{selectedUser.email ? 'Disparar Email' : 'Sem E-mail'}</span>
                  </Button>
                </div>

                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Auditoria e Segurança</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  
                  <Button 
                    variant="outline" 
                    className={`flex flex-col h-auto py-4 gap-2 ${selectedUser.balance_retained ? 'border-orange-500 bg-orange-500/20 text-orange-400' : 'border-[#2A2F40] bg-[#1A1D27] hover:bg-orange-500/20 hover:text-orange-400 hover:border-orange-500/50'}`}
                    onClick={() => handleRetainBalance(selectedUser.id, selectedUser.balance_retained)}
                  >
                    <HandCoins className="w-5 h-5" />
                    <span className="text-[10px] font-bold text-center leading-tight">
                      {selectedUser.balance_retained ? "Desbloquear Saldo" : "Reter e Congelar"}
                    </span>
                  </Button>

                  {selectedUser.is_active ? (
                    <Button 
                      variant="outline" 
                      className="border-[#2A2F40] bg-[#1A1D27] hover:bg-yellow-500/20 hover:text-yellow-500 hover:border-yellow-500/50 flex flex-col h-auto py-4 gap-2"
                      onClick={() => handleAction('suspend', selectedUser.id)}
                    >
                      <PauseCircle className="w-5 h-5" />
                      <span className="text-[10px] font-bold">Suspender</span>
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="border-[#2A2F40] bg-[#1A1D27] hover:bg-primary/20 hover:text-primary hover:border-primary/50 flex flex-col h-auto py-4 gap-2"
                      onClick={() => handleAction('activate', selectedUser.id)}
                    >
                      <UserCheck className="w-5 h-5" />
                      <span className="text-[10px] font-bold">Reativar</span>
                    </Button>
                  )}

                  <Button 
                    variant="outline" 
                    className="border-[#2A2F40] bg-[#1A1D27] hover:bg-red-900/40 hover:text-red-500 hover:border-red-600 flex flex-col h-auto py-4 gap-2"
                    onClick={() => handleAction('ban', selectedUser.id)}
                  >
                    <Ban className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Banimento Total</span>
                  </Button>

                  <Button 
                    variant="outline" 
                    className="border-red-900/30 bg-red-950/20 text-red-500 hover:bg-red-600 hover:text-white flex flex-col h-auto py-4 gap-2"
                    onClick={() => handleAction('delete', selectedUser.id)}
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Apagar Ficha</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL GLOBAL COMMUNICATION */}
      <Dialog open={globalModalOpen} onOpenChange={setGlobalModalOpen}>
        <DialogContent className="sm:max-w-[450px] bg-[#101116] border-[#2A2F40] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2 text-primary">
              <Megaphone className="w-5 h-5" /> Emissão Global
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-400 mb-4">Envie mensagens para toda a base de dados. O envio de e-mails será agendado em tranches (2000 por dia) via Resend automaticamente.</p>
          
          <div className="flex flex-col gap-3">
             <Button 
               onClick={() => { handleSendSiteMessage('GLOBAL'); setGlobalModalOpen(false); }}
               className="bg-primary/20 hover:bg-primary hover:text-black text-primary border border-primary/50 py-6"
             >
               <Send className="w-5 h-5 mr-3" /> Disparar Ponto Vermelho (Notificação no Site)
             </Button>
             
             <Button 
               onClick={() => handleSendEmail('GLOBAL')}
               className="bg-sky-500/20 hover:bg-sky-500 hover:text-black text-sky-400 border border-sky-500/50 py-6"
             >
               <Mail className="w-5 h-5 mr-3" /> Agendar Disparo de E-mails a Todos
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
