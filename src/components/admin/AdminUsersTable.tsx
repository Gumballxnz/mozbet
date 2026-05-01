"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatMZN } from "@/lib/utils";
import { Search, ShieldAlert, UserCheck, Settings, Mail, Ban, PauseCircle, HandCoins, Trash2, Megaphone, Send, AtSign, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  
  // Modais de envio de comunicação
  const [globalModalOpen, setGlobalModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [commTarget, setCommTarget] = useState<string | "GLOBAL">("");
  
  // Estados dos formulários de comunicação
  const [msgTitle, setMsgTitle] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [msgTargetEmail, setMsgTargetEmail] = useState("");
  
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

  const filteredUsers = users.filter(u => u.phone.includes(search) || (u.id.includes(search)) || (u.email && u.email.includes(search)));

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

  // Envio Realtime para a BD - Notificação de Site
  const executeSendSiteMessage = async () => {
    if (!msgTitle || !msgBody) return toast.error("Preencha título e mensagem");
    
    toast.loading("A processar a inserção realtime...", { id: "msg" });
    try {
      const targetId = commTarget === "GLOBAL" ? null : commTarget;
      
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: targetId, title: msgTitle, message: msgBody })
      });

      if (!res.ok) {
         const errorData = await res.json();
         throw new Error(errorData.error || "Erro a comunicar com o servidor");
      }
      
      toast.success(`Mensagem inserida! A bolinha vermelha vai acender instantaneamente.`, { id: "msg" });
      setMessageModalOpen(false);
      setMsgTitle("");
      setMsgBody("");
      if (commTarget === "GLOBAL") setGlobalModalOpen(false);
    } catch (e: any) {
      toast.error(`Erro a enviar: ${e.message}`, { id: "msg" });
    }
  };

  // Envio de Email
  const executeSendEmail = async () => {
    if (!msgTitle || !msgBody) return toast.error("Preencha assunto e corpo");
    if (commTarget !== 'GLOBAL' && !msgTargetEmail) return toast.error("Insira o email de destino do utilizador.");

    toast.loading(commTarget === 'GLOBAL' ? "A agendar disparo global de emails (via Resend)..." : "A enviar email individual...", { id: "email" });
    
    try {
      const payload = { target: commTarget, targetEmail: msgTargetEmail, subject: msgTitle, body: msgBody };
      const response = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error("Falha no disparo.");
      
      const data = await response.json();
      toast.success(commTarget === "GLOBAL" ? `${data.message}` : `E-mail entregue com sucesso!`, { id: "email" });
      setEmailModalOpen(false);
      setMsgTitle("");
      setMsgBody("");
      setMsgTargetEmail("");
      if (commTarget === "GLOBAL") setGlobalModalOpen(false);
    } catch (error) {
      toast.error("Falha no sistema de e-mails. Verifique se o RESEND_API_KEY está no .env", { id: "email" });
    }
  };

  const openCommDialog = (type: 'site' | 'email', target: string) => {
    setCommTarget(target);
    setMsgTitle("");
    setMsgBody("");
    setMsgTargetEmail("");
    
    if (type === 'site') setMessageModalOpen(true);
    if (type === 'email') {
      const userObj = users.find(u => u.id === target);
      if (userObj && userObj.email) {
        setMsgTargetEmail(userObj.email);
      }
      setEmailModalOpen(true);
    }
  };

  // Helper para ofuscar numero (+258 84 *** ** 12)
  const maskPhone = (phone: string) => {
    if (!phone) return "";
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 9) return phone;
    return `+258 ${clean.substring(0, 2)} *** ** ${clean.substring(clean.length - 2)}`;
  };

  const maskEmail = (email: string) => {
    if (!email) return "";
    const parts = email.split("@");
    if (parts.length !== 2) return email;
    const [name, domain] = parts;
    if (name.length <= 3) return email;
    return `${name.substring(0, 3)}***@${domain}`;
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
              placeholder="Pesquisar ID, telefone..." 
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
                <th className="px-6 py-4">Jogador (ID Único)</th>
                <th className="px-6 py-4">Saldo Real</th>
                <th className="px-6 py-4">Status / Bloqueios</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-[#2A2F40]/50 hover:bg-[#1A1D27] transition-colors">
                  <td className="px-6 py-4 flex flex-col gap-1">
                    <span className="font-mono-data font-black text-white flex items-center gap-2 text-base">
                      {user.is_admin && <ShieldAlert className="w-4 h-4 text-primary" />}
                      #{user.id.substring(0, 8).toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400 font-mono-data tracking-widest">{maskPhone(user.phone)}</span>
                    {user.email && <span className="text-[10px] text-sky-400/70 flex items-center gap-1 mt-1"><AtSign size={10}/>{maskEmail(user.email)}</span>}
                  </td>
                  <td className="px-6 py-4 font-mono-data font-black text-primary text-lg align-middle">
                    {formatMZN(user.balance)}
                  </td>
                  <td className="px-6 py-4 align-middle">
                    <div className="flex gap-2">
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
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right align-middle">
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
              Jogador: <span className="font-mono-data text-primary">#{selectedUser?.id.substring(0,8).toUpperCase()}</span>
            </DialogTitle>
            <DialogDescription className="hidden">Painel de gestão do jogador</DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6 pt-2">
              
              {selectedUser.email ? (
                 <div className="bg-sky-900/20 border border-sky-500/30 p-3 rounded-xl flex items-center gap-3">
                   <Mail className="w-5 h-5 text-sky-400" />
                   <span className="text-sm font-bold text-sky-100">{maskEmail(selectedUser.email)}</span>
                 </div>
              ) : (
                <div className="bg-gray-900/40 border border-gray-800 p-3 rounded-xl flex items-center gap-3">
                   <AtSign className="w-4 h-4 text-gray-500" />
                   <span className="text-xs font-bold text-gray-500">Sem E-mail Registado na Ficha</span>
                 </div>
              )}

              {/* Stats Financeiras */}
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
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Comunicações Diretas (Realtime)</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
                  <Button 
                    variant="outline" 
                    className="border-[#2A2F40] bg-[#1A1D27] hover:bg-primary/20 hover:text-primary flex items-center justify-center py-6 gap-3"
                    onClick={() => openCommDialog('site', selectedUser.id)}
                  >
                    <Send className="w-5 h-5 text-primary" />
                    <span className="text-sm font-bold">Enviar Notificação BD</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    disabled={!selectedUser.email}
                    className="border-[#2A2F40] bg-[#1A1D27] hover:bg-sky-500/20 hover:text-sky-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center py-6 gap-3"
                    onClick={() => openCommDialog('email', selectedUser.id)}
                  >
                    <Mail className="w-5 h-5 text-sky-400" />
                    <span className="text-sm font-bold">{selectedUser.email ? 'Enviar E-mail' : 'Sem E-mail Registado'}</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-[#2A2F40] bg-[#1A1D27] hover:bg-green-500/20 hover:text-green-500 flex items-center justify-center py-6 gap-3 md:col-span-2 lg:col-span-1"
                    onClick={() => window.open(`https://wa.me/258${selectedUser.phone.replace(/\D/g, '')}`, '_blank')}
                  >
                    <MessageCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-bold">Mensagem WhatsApp</span>
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
            <DialogDescription className="hidden">Dispare comunicações para toda a plataforma</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-gray-400 mb-4">Envie mensagens para toda a base de dados em simultâneo.</p>
          
          <div className="flex flex-col gap-3">
             <Button 
               onClick={() => openCommDialog('site', 'GLOBAL')}
               className="bg-primary/20 hover:bg-primary hover:text-black text-primary border border-primary/50 py-6"
             >
               <Send className="w-5 h-5 mr-3" /> Disparar Ponto Vermelho Realtime
             </Button>
             
             <Button 
               onClick={() => openCommDialog('email', 'GLOBAL')}
               className="bg-sky-500/20 hover:bg-sky-500 hover:text-black text-sky-400 border border-sky-500/50 py-6"
             >
               <Mail className="w-5 h-5 mr-3" /> Agendar Disparo de E-mails a Todos
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL MENSAGEM SITE (Substitui o prompt nativo) */}
      <Dialog open={messageModalOpen} onOpenChange={setMessageModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#101116] border border-primary text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-primary">
              <Send className="w-5 h-5" /> Notificação Realtime
            </DialogTitle>
            <DialogDescription className="hidden">Formulário de notificação no site</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400">Título da Mensagem</label>
              <Input 
                value={msgTitle} 
                onChange={(e) => setMsgTitle(e.target.value)} 
                placeholder="Ex: Bónus Disponível 🎉" 
                className="bg-black border-[#2A2F40]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400">Conteúdo (Aparece no Dropdown do Cliente)</label>
              <textarea 
                value={msgBody} 
                onChange={(e) => setMsgBody(e.target.value)} 
                placeholder="Escreva a mensagem aqui..." 
                className="flex w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 bg-black border-[#2A2F40] min-h-[100px]"
              />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4">
            <Button variant="outline" onClick={() => setMessageModalOpen(false)} className="bg-transparent border-[#2A2F40] mt-2 sm:mt-0">Cancelar</Button>
            <Button onClick={executeSendSiteMessage} className="bg-primary text-black font-bold">Enviar Notificação</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL EMAIL (Substitui o prompt nativo) */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#101116] border border-sky-500 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-sky-400">
              <Mail className="w-5 h-5" /> Disparo de E-mail
            </DialogTitle>
            <DialogDescription className="hidden">Formulário de disparo de email para o utilizador</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {commTarget !== 'GLOBAL' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400">E-mail de Destino</label>
                <Input 
                  value={msgTargetEmail} 
                  onChange={(e) => setMsgTargetEmail(e.target.value)} 
                  placeholder="Ex: cliente@email.com" 
                  className="bg-black border-[#2A2F40] opacity-70 cursor-not-allowed"
                  disabled
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400">Assunto do E-mail</label>
              <Input 
                value={msgTitle} 
                onChange={(e) => setMsgTitle(e.target.value)} 
                placeholder="Ex: Foste o vencedor do torneio MozBet!" 
                className="bg-black border-[#2A2F40]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400">Conteúdo do E-mail</label>
              <textarea 
                value={msgBody} 
                onChange={(e) => setMsgBody(e.target.value)} 
                placeholder="Mensagem HTML ou texto limpo..." 
                className="flex w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50 bg-black border-[#2A2F40] min-h-[150px]"
              />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4">
            <Button variant="outline" onClick={() => setEmailModalOpen(false)} className="bg-transparent border-[#2A2F40] mt-2 sm:mt-0">Cancelar</Button>
            <Button onClick={executeSendEmail} className="bg-sky-500 text-black font-bold">Lançar E-mail</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
