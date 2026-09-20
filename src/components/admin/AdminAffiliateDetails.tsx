"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMZN, cleanMocambiquePhone } from "@/lib/utils";
import {
  ArrowLeft, Percent, Users, MessageCircle, Ban,
  UserCheck, ShieldAlert, Wallet, Copy, Check, Save, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

interface AffiliateData {
  id: string;
  email?: string;
  username: string;
  phone: string;
  created_at: string;
  is_active: boolean;
  code: string;
  name: string;
  affPhone: string;
  saqueNumber: string;
  saqueMethod: string;
  saqueName: string;
  balance: number;
  referredCount: number;
  totalDeposits: number;
  depositCommissions: number;
  subCommissions: number;
  winDeductions: number;
  netEarnings: number;
  totalPaid: number;
  affiliate_percent?: number | null;
}

interface ReferralUser {
  id: string;
  phone: string;
  email?: string;
  balance: number;
  created_at: string;
  is_active: boolean;
  totalDeposited?: number;
}

export function AdminAffiliateDetails({
  affiliate: initialAffiliate,
  referrals
}: {
  affiliate: AffiliateData,
  referrals: ReferralUser[]
}) {
  const router = useRouter();
  const [affiliate, setAffiliate] = useState<AffiliateData>(initialAffiliate);

  const [commissionInput, setCommissionInput] = useState(
    affiliate.affiliate_percent !== undefined && affiliate.affiliate_percent !== null
      ? String(affiliate.affiliate_percent)
      : "70"
  );
  const [savingCommission, setSavingCommission] = useState(false);

  const [payoutModalOpen, setPayoutModalOpen] = useState(false);

  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    action: 'ban' | 'activate';
    title: string;
    description: string;
  } | null>(null);
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);

  const [copied, setCopied] = useState(false);

  const cleanNumber = cleanMocambiquePhone(affiliate.saqueNumber);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanNumber);
    setCopied(true);
    toast.success("Número copiado com sucesso!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveCommission = async () => {
    const rate = Number(commissionInput);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return toast.error("Por favor, insira uma comissão válida entre 0 e 100.");
    }

    setSavingCommission(true);
    try {
      const res = await fetch("/api/admin/users/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_affiliate_percent",
          userId: affiliate.id,
          affiliatePercent: rate
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar comissão");

      toast.success(data.message || "Comissão salva com sucesso!");
      setAffiliate(prev => ({ ...prev, affiliate_percent: rate }));
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar comissão.");
    } finally {
      setSavingCommission(false);
    }
  };

  const executePayout = async () => {
    setIsProcessingPayout(true);
    try {
      toast.loading("A registrar liquidação...", { id: "payout-action" });
      const res = await fetch("/api/admin/affiliates/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affiliateId: affiliate.id, amount: affiliate.balance })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao efetuar payout");

      toast.success(data.message || "Pagamento liquidado com sucesso!", { id: "payout-action" });

      const netAmount = affiliate.balance - (affiliate.balance >= 100 ? 20 : 0);
      setAffiliate(prev => ({
        ...prev,
        balance: 0,
        totalPaid: (prev.totalPaid || 0) + netAmount
      }));
      setPayoutModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Falha ao liquidar pagamento.", { id: "payout-action" });
    } finally {
      setIsProcessingPayout(false);
    }
  };

  const executeAction = async (action: 'ban' | 'activate', userId: string) => {
    try {
      toast.loading("A processar...", { id: "admin-aff-action" });
      const res = await fetch("/api/admin/users/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao executar ação");

      toast.success(data.message || "Ação concluída com sucesso.", { id: "admin-aff-action" });
      setAffiliate(prev => ({ ...prev, is_active: action === 'activate' }));
    } catch (err: any) {
      toast.error(err.message || "Erro ao executar ação", { id: "admin-aff-action" });
    }
  };

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const executeDelete = async () => {
    setIsDeleting(true);
    try {
      toast.loading("A apagar conta...", { id: "delete-action" });
      const res = await fetch("/api/admin/users/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", userId: affiliate.id })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao apagar conta");

      toast.success("Conta apagada permanentemente.", { id: "delete-action" });
      setDeleteModalOpen(false);

      router.push("/admin/affiliates");
    } catch (err: any) {
      toast.error(err.message || "Erro ao apagar conta.", { id: "delete-action" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">

      {}
      <div className="flex items-center justify-between border-b border-[#2A2F40] pb-5">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/admin/affiliates")}
            className="border-[#2A2F40] bg-[#101116] hover:bg-[#1A1D27] text-gray-400 hover:text-white rounded-xl cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Percent className="w-6 h-6 text-primary" />
              CRM do Parceiro: <span className="text-primary font-mono text-xl">{affiliate.code}</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Visão do afiliado, comissões e indicados.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
            affiliate.is_active ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-500 border border-red-500/30"
          }`}>
            {affiliate.is_active ? "Ativo" : "Banido"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Coluna 1: Dados do Parceiro e Finanças */}
        <div className="lg:col-span-2 space-y-6">

          {/* Card de Cadastro */}
          <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl p-6 space-y-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Dados do Parceiro</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[10px] text-gray-500 block font-bold uppercase tracking-wider">Nome</span>
                <span className="font-bold text-white text-base">{affiliate.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block font-bold uppercase tracking-wider">ID Único</span>
                <span className="font-mono text-xs text-emerald-400 select-all block mt-0.5">{affiliate.id}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#2A2F40]/40 text-sm">
              <div>
                <span className="text-[10px] text-gray-500 block font-bold uppercase tracking-wider">Código de Convite</span>
                <span className="font-mono font-black text-emerald-400 text-sm">{affiliate.code}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block font-bold uppercase tracking-wider">Telefone</span>
                <span className="text-white font-bold block mt-0.5">+{affiliate.phone}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block font-bold uppercase tracking-wider">E-mail</span>
                <span className="text-white font-bold block mt-0.5 truncate">{affiliate.email || "Não informado"}</span>
              </div>
            </div>
          </div>

          {/* Configuração da Comissão Dinâmica */}
          <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Percent className="w-4 h-4 text-primary" />
                  Taxa de Comissão Direta
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Defina a porcentagem sobre depósitos e perdas de indicados.</p>
              </div>
              <div className="bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded-xl text-xs font-black">
                Atual: {affiliate.affiliate_percent ?? 70}%
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Input
                  type="number"
                  value={commissionInput}
                  onChange={(e) => setCommissionInput(e.target.value)}
                  placeholder="Porcentagem de comissão (ex: 70)"
                  className="bg-black border-[#2A2F40] h-11 text-white pr-8 font-bold"
                  min="0"
                  max="100"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
              </div>
              <Button
                onClick={handleSaveCommission}
                disabled={savingCommission}
                className="bg-primary hover:bg-primary/80 text-black font-bold h-11 px-5 rounded-xl cursor-pointer flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {savingCommission ? "A salvar..." : "Salvar"}
              </Button>
            </div>
          </div>

          {/* Finanças Acumuladas */}
          <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Lucros e Transações</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#0B0C10] p-4 rounded-xl border border-[#2A2F40] text-center">
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Depósitos dos Indicados</span>
                <span className="text-lg font-mono font-bold text-white">{formatMZN(affiliate.totalDeposits)}</span>
              </div>
              <div className="bg-[#0B0C10] p-4 rounded-xl border border-[#2A2F40] text-center">
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                  Comissão Direta ({affiliate.affiliate_percent ?? 70}%)
                </span>
                <span className="text-lg font-mono font-bold text-emerald-400">+{formatMZN(affiliate.depositCommissions)}</span>
              </div>
              <div className="bg-[#0B0C10] p-4 rounded-xl border border-[#2A2F40] text-center">
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                  Deduções Vitórias ({affiliate.affiliate_percent ?? 70}%)
                </span>
                <span className="text-lg font-mono font-bold text-red-500">{formatMZN(affiliate.winDeductions)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#0B0C10] p-4 rounded-xl border border-[#2A2F40] text-center">
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Subafiliação (15%)</span>
                <span className="text-lg font-mono font-bold text-sky-400">+{formatMZN(affiliate.subCommissions)}</span>
              </div>
              <div className="bg-[#0B0C10] p-4 rounded-xl border border-[#2A2F40] text-center">
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Histórico Pago (Total)</span>
                <span className="text-lg font-mono font-bold text-gray-300">{formatMZN(affiliate.totalPaid || 0)}</span>
              </div>
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 text-center">
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1">A Pagar (Ganhos Atuais)</span>
                <span className="text-xl font-mono font-black text-primary block">{formatMZN(affiliate.balance)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Coluna 2: Dados Bancários, Payout e Contatos */}
        <div className="space-y-6">

          {/* Dados Bancários */}
          <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Dados de Saque</h3>

            <div className="bg-[#0B0C10] border border-[#2A2F40] p-4 rounded-xl space-y-3">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Método</span>
                  <span className="font-bold text-white uppercase">{affiliate.saqueMethod}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Titular</span>
                  <span className="font-bold text-emerald-400 block">{affiliate.saqueName || "Não Informado"}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#2A2F40]/40 flex justify-between items-center">
                <div>
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Número (Formatado)</span>
                  <span className="font-mono font-black text-white text-base tracking-wider">{cleanNumber}</span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCopy}
                  className="w-10 h-10 border border-[#2A2F40] bg-[#1A1D27] hover:bg-white/5 rounded-xl cursor-pointer text-gray-400 hover:text-white"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Payout Manual */}
            {affiliate.balance > 0 && (
              <Button
                onClick={() => setPayoutModalOpen(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl cursor-pointer flex items-center justify-center gap-2 border-none shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              >
                <Wallet className="w-4 h-4" />
                Registrar Payout Efetuado
              </Button>
            )}
          </div>

          {/* Ações e Contatos */}
          <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Ações</h3>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full border-[#2A2F40] bg-[#1A1D27] hover:bg-emerald-500/20 hover:text-emerald-400 justify-start h-11 font-bold text-xs rounded-xl cursor-pointer"
                onClick={() => window.open(`https://wa.me/258${affiliate.phone.replace(/\D/g, '')}`, '_blank')}
              >
                <MessageCircle className="w-4 h-4 mr-2.5 text-emerald-400" />
                Contato WhatsApp
              </Button>

              {affiliate.is_active ? (
                <Button
                  variant="outline"
                  className="w-full border-[#2A2F40] bg-[#1A1D27] hover:bg-red-500/20 hover:text-red-500 justify-start h-11 font-bold text-xs rounded-xl cursor-pointer"
                  onClick={() => setActionModal({
                    isOpen: true,
                    action: 'ban',
                    title: 'Banir Parceiro',
                    description: `Tem a certeza que deseja BANIR o parceiro "${affiliate.name}" (${affiliate.code})? O parceiro perderá o acesso ao painel e não poderá gerar comissões.`
                  })}
                >
                  <Ban className="w-4 h-4 mr-2.5 text-red-500" />
                  Banir Parceiro
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full border-[#2A2F40] bg-[#1A1D27] hover:bg-primary/20 hover:text-primary justify-start h-11 font-bold text-xs rounded-xl cursor-pointer"
                  onClick={() => setActionModal({
                    isOpen: true,
                    action: 'activate',
                    title: 'Reativar Parceiro',
                    description: `Tem a certeza que deseja REATIVAR o parceiro "${affiliate.name}" (${affiliate.code})? O parceiro voltará a ter acesso ao painel e poderá gerar comissões.`
                  })}
                >
                  <UserCheck className="w-4 h-4 mr-2.5 text-primary" />
                  Reativar Parceiro
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full border-[#2A2F40] bg-[#1A1D27] hover:bg-primary/20 hover:text-primary justify-start h-11 font-bold text-xs rounded-xl cursor-pointer"
                onClick={() => router.push(`/admin/users?search=${affiliate.id}`)}
              >
                <ShieldAlert className="w-4 h-4 mr-2.5 text-primary" />
                Visualizar Ficha de Jogador
              </Button>

              {/* Separador visual */}
              <div className="border-t border-red-500/20 pt-2 mt-1">
                <Button
                  variant="outline"
                  className="w-full border-red-500/30 bg-red-500/5 hover:bg-red-500/20 hover:text-red-400 text-red-500/70 justify-start h-11 font-bold text-xs rounded-xl cursor-pointer"
                  onClick={() => setDeleteModalOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2.5" />
                  Apagar Conta Permanentemente
                </Button>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Lista de Jogadores Trazidos */}
      <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-[#2A2F40]/50 pb-4">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Jogadores Indicados ({referrals.length})
          </h3>
          <p className="text-xs text-gray-500">Membros cadastrados via link do parceiro.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-gray-500 uppercase bg-[#0B0C10] border-b border-[#2A2F40] font-black tracking-wider">
              <tr>
                <th className="px-6 py-4">Jogador (ID)</th>
                <th className="px-6 py-4">Telefone</th>
                <th className="px-6 py-4">Data Cadastro</th>
                <th className="px-6 py-4">Total Depositado</th>
                <th className="px-6 py-4">Saldo em Caixa</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((ref) => (
                <tr key={ref.id} className="border-b border-[#2A2F40]/30 hover:bg-[#1A1D27]/40 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-white font-bold select-all">
                    #{ref.id}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-300">
                    +{ref.phone}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {new Date(ref.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-emerald-400 text-sm">
                    {formatMZN(ref.totalDeposited || 0)}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-primary text-sm">
                    {formatMZN(ref.balance)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                      ref.is_active ? "bg-primary/20 text-primary border border-primary/20" : "bg-red-500/20 text-red-500 border border-red-500/20"
                    }`}>
                      {ref.is_active ? "Ativo" : "Banido"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      onClick={() => router.push(`/admin/users/${ref.id}`)}
                      size="sm"
                      className="h-7 bg-[#2A2F40] hover:bg-primary hover:text-black font-bold text-[10px] text-white cursor-pointer border-none"
                    >
                      Acessar Ficha
                    </Button>
                  </td>
                </tr>
              ))}

              {referrals.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    Este parceiro ainda não trouxe nenhum jogador.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRMAÇÃO DE PAYOUT CUSTOMIZADA (SEM WINDOW.CONFIRM) */}
      <Dialog open={payoutModalOpen} onOpenChange={setPayoutModalOpen}>
        <DialogContent className="sm:max-w-[450px] bg-[#101116] border border-emerald-500 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-emerald-400">
              <Wallet className="w-5 h-5" /> Registrar Pagamento de Afiliado
            </DialogTitle>
            <DialogDescription className="hidden">Confirmação de repasse financeiro.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3 leading-relaxed text-sm text-gray-400">
            <p>
              Você está registrando um pagamento manual realizado para o parceiro **{affiliate.name}** no valor acumulado de **{formatMZN(affiliate.balance)}**.
            </p>

            <div className="bg-[#0B0C10]/80 p-3 rounded-lg border border-[#2A2F40] text-xs font-mono space-y-1">
              <div>
                <span className="text-gray-500">TITULAR CONTA:</span> <span className="text-emerald-400 font-bold">{affiliate.saqueName}</span>
              </div>
              <div>
                <span className="text-gray-500">NÚMERO DE SAQUE:</span> <span className="text-white font-bold">{cleanNumber}</span>
              </div>
              <div className="pt-1 border-t border-[#2A2F40] mt-1 flex justify-between font-bold">
                <span className="text-gray-500">VALOR LÍQUIDO A PAGAR:</span>
                <span className="text-emerald-400">
                  {formatMZN(Math.max(0, affiliate.balance - (affiliate.balance >= 100 ? 20 : 0)))}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-gray-500">
              Aviso: Ao confirmar, o saldo comissão acumulado será zerado no painel do afiliado e transferido para o total pago.
            </p>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setPayoutModalOpen(false)} className="bg-transparent border-[#2A2F40] cursor-pointer" disabled={isProcessingPayout}>
              Cancelar
            </Button>
            <Button
              onClick={executePayout}
              disabled={isProcessingPayout}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer border-none shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            >
              {isProcessingPayout ? "A processar..." : "Confirmar Pagamento Realizado"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAÇÃO DE BANIR/REATIVAR PARCEIRO */}
      <Dialog open={!!actionModal?.isOpen} onOpenChange={(open) => { if (!open) setActionModal(null); }}>
        <DialogContent className="sm:max-w-[420px] bg-[#141516] border border-[#2A2F40]/50 text-white rounded-3xl p-6 shadow-2xl focus:outline-none">
          <DialogHeader>
            <DialogTitle className={`text-lg font-black uppercase tracking-wider flex items-center gap-2 ${
              actionModal?.action === 'ban' ? 'text-red-500' : 'text-emerald-400'
            }`}>
              {actionModal?.action === 'ban' ? <Ban className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
              {actionModal?.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-400 mt-2 leading-relaxed">
              {actionModal?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setActionModal(null)}
              className="bg-[#1A1C24] hover:bg-white/5 border-[#2A2F40] text-gray-300 hover:text-white rounded-xl h-11 px-4 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (actionModal) {
                  executeAction(actionModal.action, affiliate.id);
                  setActionModal(null);
                }
              }}
              className={`font-black rounded-xl h-11 px-5 cursor-pointer border-none ${
                actionModal?.action === 'ban'
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                  : 'bg-primary hover:bg-primary/90 text-black shadow-[0_0_15px_rgba(0,255,127,0.2)]'
              }`}
            >
              {actionModal?.action === 'ban' ? 'Confirmar Banimento' : 'Confirmar Reativação'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAÇÃO DE EXCLUSÃO PERMANENTE */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-[450px] bg-[#141516] border border-red-500/30 text-white rounded-3xl p-6 shadow-2xl focus:outline-none">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-wider flex items-center gap-2 text-red-500">
              <Trash2 className="w-5 h-5" />
              Apagar Conta Permanentemente
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-400 mt-2 leading-relaxed">
              Esta ação é <strong className="text-red-400">IRREVERSÍVEL</strong>. A conta do parceiro será completamente apagada do sistema, incluindo todos os dados associados.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mt-3 space-y-2">
            <div className="text-xs text-gray-400">
              <span className="text-gray-500 font-bold block">PARCEIRO:</span>
              <span className="text-white font-bold">{affiliate.name}</span> ({affiliate.code})
            </div>
            <div className="text-xs text-gray-400">
              <span className="text-gray-500 font-bold block">E-MAIL:</span>
              <span className="text-white font-mono">{affiliate.email || "N/A"}</span>
            </div>
            <div className="text-xs text-gray-400">
              <span className="text-gray-500 font-bold block">SALDO PENDENTE:</span>
              <span className="text-red-400 font-bold">{formatMZN(affiliate.balance)}</span>
            </div>
          </div>

          <p className="text-[11px] text-red-400/70 mt-2">
            ⚠️ Todos os registos de comissões, indicados e transações vinculadas a esta conta serão perdidos.
          </p>

          <div className="flex justify-end gap-3 mt-5">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
              className="bg-[#1A1C24] hover:bg-white/5 border-[#2A2F40] text-gray-300 hover:text-white rounded-xl h-11 px-4 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={executeDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white font-black rounded-xl h-11 px-5 cursor-pointer border-none shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            >
              {isDeleting ? "A apagar..." : "Apagar Definitivamente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
