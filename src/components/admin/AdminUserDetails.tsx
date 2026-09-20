"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMZN } from "@/lib/utils";
import {
  ArrowLeft, ShieldAlert, UserCheck, Mail, Ban,
  PauseCircle, HandCoins, Trash2, Send, AtSign, MessageCircle,
  User, Calendar, CreditCard, Landmark, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

interface UserData {
  id: string;
  phone: string;
  email?: string | null;
  balance: number;
  balance_retained?: boolean;
  created_at: string;
  is_active: boolean;
  is_admin: boolean;
  role: 'user' | 'admin' | 'super_admin';
  total_deposits?: number;
  total_withdrawn?: number;
}

export function AdminUserDetails({ user: initialUser, currentUserRole }: { user: UserData, currentUserRole: string }) {
  const router = useRouter();
  const [user, setUser] = useState<UserData>(initialUser);

  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const [msgTitle, setMsgTitle] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [msgTargetEmail, setMsgTargetEmail] = useState(user.email || "");

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    confirmText?: string;
    buttonClass?: string;
    borderClass?: string;
    titleColor?: string;
    icon?: React.ReactNode;
  } | null>(null);

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

      if (action === 'delete') {
        router.push("/admin/users");
      } else {
        const updates: Partial<UserData> = {};
        if (action === 'ban' || action === 'suspend') updates.is_active = false;
        if (action === 'activate') updates.is_active = true;
        if (action === 'promote') { updates.role = 'admin'; updates.is_admin = true; }
        if (action === 'demote') { updates.role = 'user'; updates.is_admin = false; }

        setUser(prev => ({ ...prev, ...updates }));
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
        onConfirm: () => executeAction('delete', userId),
        confirmText: "Apagar Permanentemente",
        buttonClass: "bg-red-600 hover:bg-red-700 text-white",
        borderClass: "border-red-500",
        titleColor: "text-red-500",
        icon: <Trash2 className="w-5 h-5" />
      });
      return;
    }
    if (action === 'ban') {
      setConfirmModal({
        isOpen: true,
        title: "Banir Utilizador",
        description: `Deseja realmente banir o utilizador +${user.phone}? Ele perderá o acesso à conta imediatamente.`,
        onConfirm: () => executeAction('ban', userId),
        confirmText: "Confirmar Banimento",
        buttonClass: "bg-red-600 hover:bg-red-700 text-white",
        borderClass: "border-red-500",
        titleColor: "text-red-500",
        icon: <Ban className="w-5 h-5" />
      });
      return;
    }
    if (action === 'suspend') {
      setConfirmModal({
        isOpen: true,
        title: "Suspender Utilizador",
        description: `Tem a certeza que deseja suspender temporariamente o utilizador +${user.phone}?`,
        onConfirm: () => executeAction('suspend', userId),
        confirmText: "Confirmar Suspensão",
        buttonClass: "bg-yellow-600 hover:bg-yellow-700 text-white",
        borderClass: "border-yellow-500",
        titleColor: "text-yellow-500",
        icon: <PauseCircle className="w-5 h-5" />
      });
      return;
    }
    if (action === 'promote') {
      setConfirmModal({
        isOpen: true,
        title: "Promover a Administrador",
        description: `Deseja realmente promover o utilizador +${user.phone} a Administrador? Ele passará a ter acesso às funções de gestão da plataforma.`,
        onConfirm: () => executeAction('promote', userId),
        confirmText: "Confirmar Promoção",
        buttonClass: "bg-purple-600 hover:bg-purple-700 text-white",
        borderClass: "border-purple-500/30",
        titleColor: "text-purple-400",
        icon: <Shield className="w-5 h-5" />
      });
      return;
    }
    if (action === 'demote') {
      setConfirmModal({
        isOpen: true,
        title: "Despromover Administrador",
        description: `Tem a certeza que deseja despromover +${user.phone} para utilizador comum? Ele perderá imediatamente as permissões administrativas.`,
        onConfirm: () => executeAction('demote', userId),
        confirmText: "Confirmar Despromoção",
        buttonClass: "bg-red-600 hover:bg-red-700 text-white",
        borderClass: "border-red-500",
        titleColor: "text-red-500",
        icon: <ShieldAlert className="w-5 h-5" />
      });
      return;
    }
    executeAction(action, userId);
  };

  const handleRetainBalance = async (userId: string, currentStatus?: boolean) => {
    const actionText = currentStatus ? "Liberar" : "Reter";
    const actionDesc = currentStatus
      ? `Tem a certeza que deseja LIBERAR o saldo do utilizador +${user.phone}? Ele poderá voltar a apostar e levantar fundos normalmente.`
      : `Tem a certeza que deseja RETER o saldo do utilizador +${user.phone}? O saldo ficará bloqueado e ele não poderá jogar nem efetuar levantamentos.`;

    setConfirmModal({
      isOpen: true,
      title: `${actionText} Saldo`,
      description: actionDesc,
      onConfirm: async () => {
        try {
          toast.loading("A atualizar saldo...", { id: "admin-action" });
          const res = await fetch("/api/admin/users/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: 'retain', userId, balanceRetainedStatus: currentStatus })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Erro ao reter saldo");

          toast.success(!currentStatus ? "Saldo Bloqueado com sucesso! O cliente não pode jogar nem levantar." : "Saldo desbloqueado!", { id: "admin-action" });

          setUser(prev => ({ ...prev, balance_retained: !currentStatus }));
        } catch (err: any) {
          toast.error(err.message || "Erro ao reter saldo.", { id: "admin-action" });
        }
      },
      confirmText: `${actionText} Saldo`,
      buttonClass: currentStatus
        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
        : "bg-orange-600 hover:bg-orange-700 text-white",
      borderClass: currentStatus ? "border-emerald-500" : "border-orange-500",
      titleColor: currentStatus ? "text-emerald-400" : "text-orange-400",
      icon: <HandCoins className="w-5 h-5" />
    });
  };

  const executeSendSiteMessage = async () => {
    if (!msgTitle || !msgBody) return toast.error("Preencha o título e a mensagem");

    toast.loading("A enviar notificação...", { id: "msg" });
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, title: msgTitle, message: msgBody })
      });

      if (!res.ok) {
         const errorData = await res.json();
         throw new Error(errorData.error || "Erro ao comunicar com o servidor");
      }

      toast.success(`Notificação inserida com sucesso!`, { id: "msg" });
      setMessageModalOpen(false);
      setMsgTitle("");
      setMsgBody("");
    } catch (e: any) {
      toast.error(`Erro ao enviar: ${e.message}`, { id: "msg" });
    }
  };

  const executeSendEmail = async () => {
    if (!msgTitle || !msgBody) return toast.error("Preencha assunto e corpo");
    if (!msgTargetEmail) return toast.error("Insira o e-mail de destino");

    toast.loading("A enviar e-mail...", { id: "email" });

    try {
      const response = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: user.id, targetEmail: msgTargetEmail, subject: msgTitle, body: msgBody })
      });

      if (!response.ok) throw new Error("Falha no disparo.");

      toast.success(`E-mail enviado com sucesso!`, { id: "email" });
      setEmailModalOpen(false);
      setMsgTitle("");
      setMsgBody("");
    } catch (error) {
      toast.error("Falha ao enviar e-mail. Verifique a configuração do RESEND_API_KEY.", { id: "email" });
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {}
      <div className="flex items-center justify-between border-b border-[#2A2F40] pb-5">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/admin/users")}
            className="border-[#2A2F40] bg-[#101116] hover:bg-[#1A1D27] text-gray-400 hover:text-white rounded-xl cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <User className="w-6 h-6 text-primary" />
              Ficha do Jogador
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Gestão completa e auditoria em tempo real.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user.role === 'super_admin' && <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">Dono (Super Admin)</span>}
          {user.role === 'admin' && <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">Administrador</span>}
          {user.role === 'user' && <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-gray-500/20 text-gray-400 border border-gray-500/30">Utilizador</span>}
        </div>
      </div>

      {/* Grid de Conteúdo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Coluna 1: Informações Cadastrais e Stats Financeiras */}
        <div className="lg:col-span-2 space-y-6">

          {/* Card Principal do Usuário */}
          <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl p-6 space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-primary" />

            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">ID Único (UUID)</span>
                <span className="text-lg font-mono font-black text-white select-all">#{user.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  user.is_active ? "bg-primary/20 text-primary border border-primary/30" : "bg-red-500/20 text-red-500 border border-red-500/30"
                }`}>
                  {user.is_active ? "Ativo" : "Banido"}
                </span>
                {user.balance_retained && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-orange-500/20 text-orange-500 border border-orange-500/30">
                    Saldo Retido
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[#2A2F40]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0B0C10] border border-[#2A2F40] flex items-center justify-center text-primary">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Telefone</span>
                  <span className="text-base font-bold text-white">+{user.phone}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0B0C10] border border-[#2A2F40] flex items-center justify-center text-sky-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">E-mail</span>
                  <span className="text-base font-bold text-white truncate max-w-[200px] block">
                    {user.email || "Sem e-mail registado"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0B0C10] border border-[#2A2F40] flex items-center justify-center text-purple-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Membro desde</span>
                  <span className="text-base font-bold text-white">
                    {new Date(user.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cards Financeiros */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            <div className={`p-5 rounded-2xl border ${user.balance_retained ? 'bg-orange-950/20 border-orange-500/40' : 'bg-[#101116] border-[#2A2F40]'} shadow-md`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Saldo em Caixa</span>
                <CreditCard className={`w-4 h-4 ${user.balance_retained ? 'text-orange-500' : 'text-primary'}`} />
              </div>
              <span className={`text-2xl font-black block tracking-tight ${user.balance_retained ? 'text-orange-500' : 'text-white glow-primary'}`}>
                {formatMZN(user.balance)}
              </span>
              {user.balance_retained && (
                <span className="text-[9px] font-bold text-orange-400 mt-2 block uppercase leading-tight">
                  Bloqueado para jogo/saque
                </span>
              )}
            </div>

            <div className="bg-[#101116] border border-[#2A2F40] p-5 rounded-2xl shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Depósitos Totais</span>
                <Landmark className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-2xl font-black text-white block tracking-tight">
                {formatMZN(user.total_deposits || 0)}
              </span>
            </div>

            <div className="bg-[#101116] border border-[#2A2F40] p-5 rounded-2xl shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Levantamentos</span>
                <ArrowLeft className="w-4 h-4 text-red-400 rotate-135" />
              </div>
              <span className="text-2xl font-black text-white block tracking-tight">
                {formatMZN(user.total_withdrawn || 0)}
              </span>
            </div>

          </div>

        </div>

        {/* Coluna 2: Ações, Segurança e Auditoria */}
        <div className="space-y-6">

          {/* Comunicações Diretas */}
          <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Comunicações Diretas</h3>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full border-[#2A2F40] bg-[#1A1D27] hover:bg-primary/20 hover:text-primary justify-start h-11 font-bold text-xs rounded-xl cursor-pointer"
                onClick={() => setMessageModalOpen(true)}
              >
                <Send className="w-4 h-4 mr-2.5 text-primary" />
                Notificação Interna (Site)
              </Button>

              <Button
                variant="outline"
                disabled={!user.email}
                className="w-full border-[#2A2F40] bg-[#1A1D27] hover:bg-sky-500/20 hover:text-sky-400 justify-start h-11 font-bold text-xs rounded-xl cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={() => setEmailModalOpen(true)}
              >
                <Mail className="w-4 h-4 mr-2.5 text-sky-400" />
                Enviar Notificação E-mail
              </Button>

              <Button
                variant="outline"
                className="w-full border-[#2A2F40] bg-[#1A1D27] hover:bg-green-500/20 hover:text-green-500 justify-start h-11 font-bold text-xs rounded-xl cursor-pointer"
                onClick={() => window.open(`https://wa.me/258${user.phone.replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Sou do suporte da MozBet.')}`, '_blank')}
              >
                <MessageCircle className="w-4 h-4 mr-2.5 text-green-500" />
                Mensagem via WhatsApp
              </Button>
            </div>
          </div>

          {/* Segurança e Auditoria */}
          <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Auditoria e Segurança</h3>

            {/* Restrições de Hierarquia */}
            {(user.role === 'super_admin' || (user.role === 'admin' && currentUserRole === 'admin')) && (
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                <p className="text-[11px] text-red-400 font-bold leading-normal">
                  ⚠️ Ações administrativas desabilitadas por regra de hierarquia.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                disabled={user.role === 'super_admin' || (user.role === 'admin' && currentUserRole === 'admin')}
                className={`h-16 flex flex-col items-center justify-center gap-1.5 rounded-xl text-[10px] font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${user.balance_retained ? 'border-orange-500 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20' : 'border-[#2A2F40] bg-[#1A1D27] hover:bg-orange-500/10 hover:text-orange-400'}`}
                onClick={() => handleRetainBalance(user.id, user.balance_retained)}
              >
                <HandCoins className="w-5 h-5" />
                {user.balance_retained ? "Liberar Saldo" : "Reter Saldo"}
              </Button>

              {user.is_active ? (
                <Button
                  variant="outline"
                  disabled={user.role === 'super_admin' || (user.role === 'admin' && currentUserRole === 'admin')}
                  className="h-16 border-[#2A2F40] bg-[#1A1D27] hover:bg-yellow-500/10 hover:text-yellow-500 flex flex-col items-center justify-center gap-1.5 rounded-xl text-[10px] font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  onClick={() => handleAction('suspend', user.id)}
                >
                  <PauseCircle className="w-5 h-5 text-yellow-500" />
                  Suspender
                </Button>
              ) : (
                <Button
                  variant="outline"
                  disabled={user.role === 'super_admin' || (user.role === 'admin' && currentUserRole === 'admin')}
                  className="h-16 border-[#2A2F40] bg-[#1A1D27] hover:bg-primary/10 hover:text-primary flex flex-col items-center justify-center gap-1.5 rounded-xl text-[10px] font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  onClick={() => handleAction('activate', user.id)}
                >
                  <UserCheck className="w-5 h-5 text-primary" />
                  Reativar
                </Button>
              )}

              <Button
                variant="outline"
                disabled={user.role === 'super_admin' || (user.role === 'admin' && currentUserRole === 'admin')}
                className="h-16 border-[#2A2F40] bg-[#1A1D27] hover:bg-red-500/10 hover:text-red-500 flex flex-col items-center justify-center gap-1.5 rounded-xl text-[10px] font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={() => handleAction('ban', user.id)}
              >
                <Ban className="w-5 h-5 text-red-500" />
                Banimento
              </Button>

              <Button
                variant="outline"
                disabled={user.role === 'super_admin' || (user.role === 'admin' && currentUserRole === 'admin')}
                className="h-16 border-red-950/20 bg-red-950/10 text-red-500 hover:bg-red-600 hover:text-white flex flex-col items-center justify-center gap-1.5 rounded-xl text-[10px] font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={() => handleAction('delete', user.id)}
              >
                <Trash2 className="w-5 h-5" />
                Apagar Conta
              </Button>
            </div>
          </div>

          {/* Gestão de Equipe (Apenas Super Admin) */}
          {currentUserRole === 'super_admin' && (
            <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl p-6 space-y-4 shadow-xl">
              <h3 className="text-xs font-black text-purple-400 uppercase tracking-wider">Gestão de Equipa (Dono)</h3>

              {user.role === 'user' ? (
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-11 text-xs rounded-xl cursor-pointer"
                  onClick={() => handleAction('promote', user.id)}
                >
                  <Shield className="w-4 h-4 mr-2" /> Promover a Administrador
                </Button>
              ) : user.role === 'admin' ? (
                <Button
                  variant="destructive"
                  className="w-full font-bold h-11 text-xs rounded-xl cursor-pointer bg-red-600 hover:bg-red-700"
                  onClick={() => handleAction('demote', user.id)}
                >
                  <ShieldAlert className="w-4 h-4 mr-2" /> Despromover Administrador
                </Button>
              ) : null}
            </div>
          )}

        </div>

      </div>

      {/* MODAL MENSAGEM INTERNA */}
      <Dialog open={messageModalOpen} onOpenChange={setMessageModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#101116] border border-primary text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-primary">
              <Send className="w-5 h-5" /> Notificação no Site
            </DialogTitle>
            <DialogDescription className="hidden">Envio de mensagem interna de alerta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400">Título da Mensagem</label>
              <Input
                value={msgTitle}
                onChange={(e) => setMsgTitle(e.target.value)}
                placeholder="Ex: Bónus Disponível 🎉"
                className="bg-black border-[#2A2F40] text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400">Conteúdo (Aparece no Dropdown do Cliente)</label>
              <textarea
                value={msgBody}
                onChange={(e) => setMsgBody(e.target.value)}
                placeholder="Escreva a mensagem aqui..."
                className="flex w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 bg-black border-[#2A2F40] min-h-[100px] text-white"
              />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4 gap-2">
            <Button variant="outline" onClick={() => setMessageModalOpen(false)} className="bg-transparent border-[#2A2F40] cursor-pointer">Cancelar</Button>
            <Button onClick={executeSendSiteMessage} className="bg-primary text-black font-bold cursor-pointer">Enviar Notificação</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL EMAIL */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#101116] border border-sky-500 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-sky-400">
              <Mail className="w-5 h-5" /> Disparo de E-mail
            </DialogTitle>
            <DialogDescription className="hidden">Disparo de e-mail usando Resend.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400">E-mail de Destino</label>
              <Input
                value={msgTargetEmail}
                onChange={(e) => setMsgTargetEmail(e.target.value)}
                className="bg-black border-[#2A2F40] text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400">Assunto</label>
              <Input
                value={msgTitle}
                onChange={(e) => setMsgTitle(e.target.value)}
                placeholder="Assunto do e-mail..."
                className="bg-black border-[#2A2F40] text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400">Corpo do E-mail (HTML permitido)</label>
              <textarea
                value={msgBody}
                onChange={(e) => setMsgBody(e.target.value)}
                placeholder="Olá jogador, ..."
                className="flex w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 bg-black border-[#2A2F40] min-h-[120px] text-white"
              />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4 gap-2">
            <Button variant="outline" onClick={() => setEmailModalOpen(false)} className="bg-transparent border-[#2A2F40] cursor-pointer">Cancelar</Button>
            <Button onClick={executeSendEmail} className="bg-sky-500 text-black font-bold cursor-pointer">Enviar E-mail</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CONFIRM MODAL */}
      <Dialog open={!!confirmModal} onOpenChange={(open) => !open && setConfirmModal(null)}>
        <DialogContent className={`sm:max-w-[420px] bg-[#101116] border text-white rounded-3xl p-6 shadow-2xl focus:outline-none ${confirmModal?.borderClass || 'border-[#2A2F40]'}`}>
          <DialogHeader>
            <DialogTitle className={`text-xl font-bold flex items-center gap-2 uppercase tracking-wider ${confirmModal?.titleColor || 'text-white'}`}>
              {confirmModal?.icon || <ShieldAlert className="w-5 h-5" />}
              {confirmModal?.title}
            </DialogTitle>
            <DialogDescription className="hidden">Modal de Confirmação Crítica</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-gray-400 py-3 leading-relaxed">{confirmModal?.description}</p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setConfirmModal(null)} className="border-[#2A2F40] bg-[#1A1C24] hover:bg-white/5 text-gray-300 hover:text-white rounded-xl h-11 px-4 cursor-pointer">Cancelar</Button>
            <Button
              onClick={() => {
                confirmModal?.onConfirm();
                setConfirmModal(null);
              }}
              className={`font-bold cursor-pointer rounded-xl h-11 px-5 ${confirmModal?.buttonClass || 'bg-primary text-black'}`}
            >
              {confirmModal?.confirmText || 'Confirmar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
