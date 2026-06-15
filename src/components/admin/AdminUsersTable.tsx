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
  role: 'user' | 'admin' | 'super_admin';
  total_deposits?: number;
  total_withdrawn?: number;
}

export function AdminUsersTable({ initialUsers, currentUserRole, totalCount = 0 }: { initialUsers: UserData[], currentUserRole: string, totalCount?: number }) {
  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Modal de confirmação customizado para ações administrativas sensíveis (deletar utilizador)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);
  
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
        const isAffiliate = payload.new && (payload.new as any).is_affiliate === true;

        if (payload.eventType === 'INSERT') {
          if (!isAffiliate) {
            setUsers(prev => [payload.new as UserData, ...prev]);
          }
        } else if (payload.eventType === 'UPDATE') {
          if (isAffiliate) {
            // Se virou afiliado, removemos da lista de jogadores comuns
            setUsers(prev => prev.filter(u => u.id !== payload.new.id));
            if (selectedUser?.id === payload.new.id) {
              setSelectedUser(null);
            }
          } else {
            setUsers(prev => prev.map(u => u.id === payload.new.id ? { ...u, ...payload.new } : u));
            if (selectedUser?.id === payload.new.id) {
              setSelectedUser({ ...selectedUser, ...payload.new } as UserData);
            }
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
  // Busca Dinâmica no Banco de Dados com Debounce e suporte a termos em Português
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      const term = search.trim().toLowerCase();
      if (!term) {
        setUsers(initialUsers);
        setPage(1);
        return;
      }

      setLoadingMore(true);
      try {
        let roleFilter = "";
        if ("administrador".includes(term) || "admin".includes(term)) {
          roleFilter = "admin";
        } else if ("proprietário".includes(term) || "proprietario".includes(term) || "dono".includes(term) || "super".includes(term)) {
          roleFilter = "super_admin";
        } else if ("utilizador".includes(term) || "user".includes(term) || "cliente".includes(term)) {
          roleFilter = "user";
        }

        const cleanPhoneSearch = term.replace(/\D/g, "");

        let query = supabase
          .from("users")
          .select("*")
          .or("is_affiliate.is.null,is_affiliate.eq.false")
          .order("created_at", { ascending: false });

        let orConditions = `id.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`;
        if (cleanPhoneSearch && cleanPhoneSearch.length > 2) {
          orConditions += `,phone.ilike.%${cleanPhoneSearch}%`;
        }
        if (roleFilter) {
          orConditions += `,role.eq.${roleFilter}`;
        }
        
        query = query.or(orConditions);

        const { data, error } = await query.limit(50);
        if (error) throw error;

        const mapped = (data || []).map(u => ({
          ...u,
          role: u.role || (u.is_admin ? 'super_admin' : 'user')
        }));

        setUsers(mapped as UserData[]);
      } catch (err: any) {
        console.error("Erro na busca dinâmica:", err);
      } finally {
        setLoadingMore(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [search, initialUsers]);

  const loadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    const start = (nextPage - 1) * 30;
    const end = start + 29;
    
    const { data } = await supabase
      .from("users")
      .select("*")
      .or("is_affiliate.is.null,is_affiliate.eq.false")
      .order("created_at", { ascending: false })
      .range(start, end);

    if (data && data.length > 0) {
      setUsers(prev => [...prev, ...(data as UserData[])]);
      setPage(nextPage);
    }
    setLoadingMore(false);
  };

  const filteredUsers = users.filter(u => {
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase().trim();
    
    let roleText = "utilizador cliente user";
    if (u.role === 'super_admin') roleText = "proprietário dono super admin super_admin";
    else if (u.role === 'admin') roleText = "administrador admin";

    const phoneClean = u.phone.replace(/\D/g, "");
    const searchClean = search.replace(/\D/g, "");

    const matchesPhone = u.phone.includes(search) || 
                         (searchClean && phoneClean.includes(searchClean));

    const matchesId = u.id.toLowerCase().includes(searchLower);
    const matchesEmail = u.email && u.email.toLowerCase().includes(searchLower);
    const matchesRole = roleText.includes(searchLower);

    return matchesPhone || matchesId || matchesEmail || matchesRole;
  });
  const executeAction = async (action: 'ban' | 'suspend' | 'activate' | 'delete' | 'promote' | 'demote', userId: string) => {
    try {
      toast.loading("A executar...", { id: "admin-action" });
      const res = await fetch("/api/admin/users/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao executar ação");
      
      toast.success(data.message || "Ação concluída.", { id: "admin-action" });
      
      // Update local state instantly (Optimistic UI)
      if (action === 'delete') {
        setSelectedUser(null);
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        const updates: Partial<UserData> = {};
        if (action === 'ban' || action === 'suspend') updates.is_active = false;
        if (action === 'activate') updates.is_active = true;
        if (action === 'promote') { updates.role = 'admin'; updates.is_admin = true; }
        if (action === 'demote') { updates.role = 'user'; updates.is_admin = false; }
        
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
        if (selectedUser?.id === userId) {
          setSelectedUser(prev => prev ? { ...prev, ...updates } : prev);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao executar ação", { id: "admin-action" });
    }
  };

  const handleAction = async (action: 'ban' | 'suspend' | 'activate' | 'delete' | 'promote' | 'demote', userId: string) => {
    if (action === 'delete') {
      setConfirmModal({
        isOpen: true,
        title: "Apagar Ficha de Utilizador",
        description: "Aviso: Apagar este utilizador removerá permanentemente todos os seus dados e histórico. Esta ação é irreversível. Deseja continuar?",
        onConfirm: () => executeAction('delete', userId)
      });
      return;
    }
    // Ações normais (bloqueio/desbloqueio/cargo) podem rodar diretamente
    executeAction(action, userId);
  };

  const handleRetainBalance = async (userId: string, currentStatus?: boolean) => {
    try {
      toast.loading("A atualizar saldo...", { id: "admin-action" });
      const res = await fetch("/api/admin/users/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: 'retain', userId, balanceRetainedStatus: currentStatus })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao reter saldo");
      
      toast.success(!currentStatus ? "Saldo Bloqueado com sucesso. O cliente não pode jogar nem levantar." : "Saldo desbloqueado!", { id: "admin-action" });
      
      // Update local state instantly
      const updates = { balance_retained: !currentStatus };
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, ...updates } : prev);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao reter saldo.", { id: "admin-action" });
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

  // Exibição dos dados do telefone e e-mail sem ofuscação (filtros removidos)
  const maskPhone = (phone: string) => {
    return phone ? `+258 ${phone}` : "";
  };

  const maskEmail = (email: string) => {
    return email || "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestão de Clientes</h1>
          <p className="text-muted-foreground">Monitorize em tempo real, efetue bloqueios e dispare comunicações.</p>
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold tracking-wider uppercase">
            Total de Registos: {totalCount}
          </div>
        </div>
        
        <div className="flex w-full sm:w-auto items-center gap-3">
          <Button 
            onClick={() => setGlobalModalOpen(true)}
            className="bg-primary/20 text-primary border border-primary/50 font-bold hidden md:flex"
          >
            <Megaphone className="w-4 h-4 mr-2" /> Comunicado Global
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

      <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl overflow-hidden shadow-xl hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-gray-500 uppercase bg-[#0B0C10] border-b border-[#2A2F40] font-black tracking-wider">
              <tr>
                <th className="px-6 py-4">Jogador (ID Único)</th>
                <th className="px-6 py-4">Data de Criação</th>
                <th className="px-6 py-4">Saldo Real</th>
                <th className="px-6 py-4">Status / Bloqueios</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-[#2A2F40]/50 hover:bg-[#1A1D27] transition-colors">
                  <td className="px-6 py-4 flex flex-col gap-1">
                    <span className="font-mono-data font-black text-white flex items-center gap-2 text-sm select-all">
                      {user.is_admin && <ShieldAlert className="w-4 h-4 text-primary" />}
                      #{user.id}
                    </span>
                    <span className="text-xs text-gray-400 font-mono-data tracking-widest">{maskPhone(user.phone)}</span>
                    {user.email && <span className="text-[10px] text-sky-400/70 flex items-center gap-1 mt-1"><AtSign size={10}/>{maskEmail(user.email)}</span>}
                    <div className="mt-1">
                      {user.role === 'super_admin' && <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">Dono (Super Admin)</span>}
                      {user.role === 'admin' && <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">Administrador</span>}
                      {user.role === 'user' && <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-gray-500/20 text-gray-400 border border-gray-500/30">Utilizador</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400 font-mono-data align-middle">
                    {new Date(user.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
        
        {users.length < totalCount && (
          <div className="p-4 border-t border-[#2A2F40] flex justify-center bg-[#0B0C10]">
            <Button 
              onClick={loadMore} 
              disabled={loadingMore}
              variant="outline"
              className="border-[#2A2F40] text-gray-400 hover:text-white hover:bg-[#1A1D27] min-w-[200px]"
            >
              {loadingMore ? "A carregar..." : `Ver próximos utilizadores (${users.length} de ${totalCount})`}
            </Button>
          </div>
        )}
      </div>

      {/* Layout de Cards para Mobile */}
      <div className="space-y-4 md:hidden">
        <div className="grid grid-cols-1 gap-4">
          {filteredUsers.map((user) => (
            <div key={user.id} className="bg-[#101116] border border-[#2A2F40]/60 rounded-2xl p-4 space-y-3 shadow-md text-left">
              <div className="flex justify-between items-start">
                <div className="flex flex-col min-w-0">
                  <span className="font-mono-data font-black text-white flex items-center gap-1.5 text-xs select-all truncate">
                    {user.is_admin && <ShieldAlert className="w-4 h-4 text-primary" />}
                    #{user.id}
                  </span>
                  <span className="text-xs text-gray-400 font-mono-data tracking-wider">{maskPhone(user.phone)}</span>
                  {user.email && <span className="text-[10px] text-sky-400/70 flex items-center gap-1 mt-1"><AtSign size={10}/>{maskEmail(user.email)}</span>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {user.role === 'super_admin' && <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-purple-500/20 text-purple-400 border border-purple-500/30">Dono</span>}
                  {user.role === 'admin' && <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-primary/20 text-primary border border-primary/30">Admin</span>}
                  {user.role === 'user' && <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-gray-500/20 text-gray-400 border border-gray-500/30">Cliente</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2A2F40]/30 text-xs">
                <div>
                  <span className="text-gray-500 block">Saldo Real</span>
                  <span className="font-mono-data font-black text-primary text-base">{formatMZN(user.balance)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Criado em</span>
                  <span className="text-gray-300 font-medium">{new Date(user.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[#2A2F40]/30">
                <div className="flex gap-1.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    user.is_active ? "bg-primary/10 text-primary border border-primary/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                  }`}>
                    {user.is_active ? "Ativo" : "Banido"}
                  </span>
                  {user.balance_retained && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/20">
                      Retido
                    </span>
                  )}
                </div>
                
                <Button 
                  onClick={() => setSelectedUser(user)}
                  size="sm" 
                  className="h-8 bg-[#2A2F40] hover:bg-primary hover:text-black font-bold text-xs text-white transition-all rounded-lg cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 mr-1" />
                  Gerir Conta
                </Button>
              </div>
            </div>
          ))}
          
          {filteredUsers.length === 0 && (
            <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl p-8 text-center text-muted-foreground">
              Nenhum utilizador encontrado.
            </div>
          )}
        </div>

        {users.length < totalCount && (
          <div className="flex justify-center pt-2 pb-4">
            <Button 
              onClick={loadMore} 
              disabled={loadingMore}
              variant="outline"
              className="border-[#2A2F40] text-gray-400 hover:text-white hover:bg-[#1A1D27] w-full cursor-pointer"
            >
              {loadingMore ? "A carregar..." : `Ver próximos utilizadores (${users.length} de ${totalCount})`}
            </Button>
          </div>
        )}
      </div>

      {/* MODAL DE CRM COMPLETO DO UTILIZADOR */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto bg-[#101116] border-[#2A2F40] text-white scrollbar-thin scrollbar-thumb-[#2A2F40]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-primary" />
              Jogador: <span className="font-mono-data text-primary text-sm select-all">#{selectedUser?.id}</span>
            </DialogTitle>
            <DialogDescription className="hidden">Painel de gestão do jogador</DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6 pt-2">
              
              <div className="bg-[#0B0C10] border border-[#2A2F40] p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Número de Telefone</span>
                    <span className="text-lg font-black text-white">+{selectedUser.phone}</span>
                  </div>
                </div>
                <div className="text-right">
                   <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Membro desde</span>
                   <span className="text-xs font-bold text-gray-300">{new Date(selectedUser.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              {selectedUser.email ? (
                 <div className="bg-sky-900/20 border border-sky-500/30 p-3 rounded-xl flex items-center gap-3">
                   <Mail className="w-5 h-5 text-sky-400" />
                   <span className="text-sm font-bold text-sky-100">{selectedUser.email}</span>
                 </div>
              ) : (
                <div className="bg-gray-900/40 border border-gray-800 p-3 rounded-xl flex items-center gap-3">
                   <AtSign className="w-4 h-4 text-gray-500" />
                   <span className="text-xs font-bold text-gray-500">Sem E-mail Registado na Ficha</span>
                 </div>
              )}

              {/* Stats Financeiras */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`col-span-1 sm:col-span-2 p-4 rounded-xl border ${selectedUser.balance_retained ? 'bg-orange-950/40 border-orange-500/50' : 'bg-[#0B0C10] border-[#2A2F40]'}`}>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Saldo em Caixa</span>
                  <span className={`text-3xl font-black ${selectedUser.balance_retained ? 'text-orange-500' : 'text-white glow-primary'}`}>{formatMZN(selectedUser.balance)}</span>
                  {selectedUser.balance_retained && <span className="text-[10px] font-bold text-orange-400 mt-1 block">BLOQUEADO. UTILIZADOR NÃO PODE MOVER FUNDOS.</span>}
                </div>
                <div className="bg-[#0B0C10] p-4 rounded-xl border border-[#2A2F40] flex flex-col justify-center min-h-[80px]">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Depósitos Totais</span>
                  <span className="text-lg font-bold text-gray-300">{formatMZN(selectedUser.total_deposits || 0)}</span>
                </div>
                <div className="bg-[#0B0C10] p-4 rounded-xl border border-[#2A2F40] flex flex-col justify-center min-h-[80px]">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Levantamentos</span>
                  <span className="text-lg font-bold text-red-400">{formatMZN(selectedUser.total_withdrawn || 0)}</span>
                </div>
              </div>

              {/* Acções Rápidas */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Comunicações Diretas (Realtime)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
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
                    onClick={() => window.open(`https://wa.me/258${selectedUser.phone.replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Sou do suporte da MozBet.')}`, '_blank')}
                  >
                    <MessageCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-bold">Mensagem WhatsApp</span>
                  </Button>
                </div>

                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Auditoria e Segurança</h3>
                
                {/* Avisos de Hierarquia */}
                {(selectedUser.role === 'super_admin' || (selectedUser.role === 'admin' && currentUserRole === 'admin')) && (
                  <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl mb-4">
                    <p className="text-xs text-red-400 font-bold">⚠️ Acções bloqueadas por hierarquia. Sem permissão para modificar o estado deste membro.</p>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  
                  <Button 
                    variant="outline" 
                    disabled={selectedUser.role === 'super_admin' || (selectedUser.role === 'admin' && currentUserRole === 'admin')}
                    className={`flex flex-col h-auto py-4 gap-2 disabled:opacity-30 disabled:cursor-not-allowed ${selectedUser.balance_retained ? 'border-orange-500 bg-orange-500/20 text-orange-400' : 'border-[#2A2F40] bg-[#1A1D27] hover:bg-orange-500/20 hover:text-orange-400 hover:border-orange-500/50'}`}
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
                      disabled={selectedUser.role === 'super_admin' || (selectedUser.role === 'admin' && currentUserRole === 'admin')}
                      className="border-[#2A2F40] bg-[#1A1D27] hover:bg-yellow-500/20 hover:text-yellow-500 hover:border-yellow-500/50 flex flex-col h-auto py-4 gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                      onClick={() => handleAction('suspend', selectedUser.id)}
                    >
                      <PauseCircle className="w-5 h-5" />
                      <span className="text-[10px] font-bold">Suspender</span>
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      disabled={selectedUser.role === 'super_admin' || (selectedUser.role === 'admin' && currentUserRole === 'admin')}
                      className="border-[#2A2F40] bg-[#1A1D27] hover:bg-primary/20 hover:text-primary hover:border-primary/50 flex flex-col h-auto py-4 gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                      onClick={() => handleAction('activate', selectedUser.id)}
                    >
                      <UserCheck className="w-5 h-5" />
                      <span className="text-[10px] font-bold">Reativar</span>
                    </Button>
                  )}

                  <Button 
                    variant="outline" 
                    disabled={selectedUser.role === 'super_admin' || (selectedUser.role === 'admin' && currentUserRole === 'admin')}
                    className="border-[#2A2F40] bg-[#1A1D27] hover:bg-red-900/40 hover:text-red-500 hover:border-red-600 flex flex-col h-auto py-4 gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                    onClick={() => handleAction('ban', selectedUser.id)}
                  >
                    <Ban className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Banimento Total</span>
                  </Button>

                  <Button 
                    variant="outline" 
                    disabled={selectedUser.role === 'super_admin' || (selectedUser.role === 'admin' && currentUserRole === 'admin')}
                    className="border-red-900/30 bg-red-950/20 text-red-500 hover:bg-red-600 hover:text-white flex flex-col h-auto py-4 gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                    onClick={() => handleAction('delete', selectedUser.id)}
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Apagar Ficha</span>
                  </Button>
                </div>

                {/* Gestão de Equipa (Apenas Super Admin) */}
                {currentUserRole === 'super_admin' && (
                  <div className="mt-8 pt-6 border-t border-[#2A2F40]">
                    <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">Gestão de Equipa (Dono)</h3>
                    {selectedUser.role === 'user' && (
                       <Button 
                         className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                         onClick={() => handleAction('promote', selectedUser.id)}
                       >
                         <ShieldAlert className="w-4 h-4 mr-2" /> Promover a Administrador
                       </Button>
                    )}
                    {selectedUser.role === 'admin' && (
                       <Button 
                         variant="destructive"
                         className="w-full font-bold bg-red-600 hover:bg-red-700"
                         onClick={() => handleAction('demote', selectedUser.id)}
                       >
                         <UserCheck className="w-4 h-4 mr-2" /> Despromover para Utilizador Normal
                       </Button>
                    )}
                  </div>
                )}
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

      {/* Modal de Confirmação Customizado para exclusão */}
      <Dialog open={!!confirmModal?.isOpen} onOpenChange={(open) => { if (!open) setConfirmModal(null); }}>
        <DialogContent className="sm:max-w-[400px] bg-[#141516] border border-[#2A2F40]/50 text-white rounded-3xl p-6 shadow-2xl focus:outline-none">
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
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
