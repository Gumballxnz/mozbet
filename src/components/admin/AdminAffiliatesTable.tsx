"use client";

import { useState } from "react";
import { Search, Settings, Ban, UserCheck, ShieldAlert, Wallet, Percent, Users, MessageCircle, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatMZN } from "@/lib/utils";

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
}

export function AdminAffiliatesTable({ initialAffiliates }: { initialAffiliates: AffiliateData[] }) {
  const [affiliates, setAffiliates] = useState<AffiliateData[]>(initialAffiliates);
  const [search, setSearch] = useState("");
  const [selectedAffiliate, setSelectedAffiliate] = useState<AffiliateData | null>(null);

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

      setAffiliates(prev => prev.map(a => {
        if (a.id === userId) {
          const updated = { ...a, is_active: action === 'activate' };
          if (selectedAffiliate?.id === userId) {
            setSelectedAffiliate(updated);
          }
          return updated;
        }
        return a;
      }));
    } catch (err: any) {
      toast.error(err.message || "Erro ao executar ação", { id: "admin-aff-action" });
    }
  };

  const filteredAffiliates = affiliates.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.username.toLowerCase().includes(search.toLowerCase()) ||
    a.code.toLowerCase().includes(search.toLowerCase()) ||
    a.phone.includes(search) ||
    a.id.includes(search) ||
    (a.email && a.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Percent className="w-8 h-8 text-primary" />
            CRM de Afiliados
          </h1>
          <p className="text-muted-foreground">Monitorize os parceiros, lucros gerados para a casa, indicados e dados de saque.</p>
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wider uppercase">
            Total de Afiliados: {affiliates.length}
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar Nome, Código, Telefone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#101116] border-[#2A2F40] h-10 text-white"
          />
        </div>
      </div>

      <div className="bg-[#101116] border border-[#2A2F40] rounded-2xl overflow-hidden shadow-xl hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-gray-500 uppercase bg-[#0B0C10] border-b border-[#2A2F40] font-black tracking-wider">
              <tr>
                <th className="px-6 py-4">Parceiro</th>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4 text-center">Indicados</th>
                <th className="px-6 py-4">Depósitos Jogadores</th>
                <th className="px-6 py-4">Lucro do Parceiro</th>
                <th className="px-6 py-4">Saldo Comissão</th>
                <th className="px-6 py-4">Dados de Saque</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredAffiliates.map((aff) => (
                <tr key={aff.id} className="border-b border-[#2A2F40]/50 hover:bg-[#1A1D27] transition-colors">
                  <td className="px-6 py-4 flex flex-col gap-0.5">
                    <span className="font-bold text-white text-sm">
                      {aff.name}
                    </span>
                    <span className="text-xs text-gray-400 font-mono tracking-wider">+{aff.phone}</span>
                    {aff.email && <span className="text-[10px] text-sky-400/80 font-mono">{aff.email}</span>}
                  </td>
                  <td className="px-6 py-4 align-middle">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {aff.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-white text-base align-middle font-mono">
                    {aff.referredCount}
                  </td>
                  <td className="px-6 py-4 align-middle font-mono text-xs">
                    <div className="text-gray-300 font-bold">{formatMZN(aff.totalDeposits)}</div>
                    <div className="text-[10px] text-gray-500">Comissão direta: {formatMZN(aff.depositCommissions)}</div>
                  </td>
                  <td className="px-6 py-4 align-middle font-mono text-xs">
                    <div className={`font-black ${aff.netEarnings >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                      {aff.netEarnings >= 0 ? '+' : ''}{formatMZN(aff.netEarnings)}
                    </div>
                    {aff.winDeductions !== 0 && (
                      <div className="text-[10px] text-red-500/70">Deduções vitórias: {formatMZN(aff.winDeductions)}</div>
                    )}
                    {aff.subCommissions > 0 && (
                      <div className="text-[10px] text-sky-400">Subafiliação: +{formatMZN(aff.subCommissions)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono font-black text-primary text-base align-middle">
                    {formatMZN(aff.balance)}
                  </td>
                  <td className="px-6 py-4 align-middle text-xs">
                    <span className="font-bold text-white uppercase">{aff.saqueMethod}</span>
                    <span className="block text-[10px] text-emerald-400 font-bold">{aff.saqueName || "Sem Titular"}</span>
                    <span className="block text-gray-400 font-mono">+{aff.saqueNumber}</span>
                  </td>
                  <td className="px-6 py-4 text-right align-middle">
                    <Button 
                      onClick={() => setSelectedAffiliate(aff)}
                      size="sm" 
                      className="h-8 bg-[#2A2F40] hover:bg-primary hover:text-black font-bold text-white transition-all border-none"
                    >
                      Detalhes CRM
                    </Button>
                  </td>
                </tr>
              ))}

              {filteredAffiliates.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground font-medium">
                    Nenhum parceiro de afiliados encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid para Mobile/Medium screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
        {filteredAffiliates.map((aff) => (
          <div key={aff.id} className="bg-[#101116] border border-[#2A2F40]/60 rounded-2xl p-4 space-y-3 shadow-md text-left text-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-bold text-white text-base block">{aff.name}</span>
                <span className="text-xs text-emerald-400 font-mono font-bold tracking-wider">{aff.code}</span>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                aff.is_active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
              }`}>
                {aff.is_active ? "Ativo" : "Banido"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2A2F40]/30 text-xs font-mono">
              <div>
                <span className="text-gray-500 block">Saldo Comissão</span>
                <span className="font-black text-primary text-base">{formatMZN(aff.balance)}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Indicados</span>
                <span className="text-white font-bold text-base">{aff.referredCount}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2A2F40]/30 text-xs font-mono">
              <div>
                <span className="text-gray-500 block">Ganhos Líquidos</span>
                <span className={`font-black ${aff.netEarnings >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                  {aff.netEarnings >= 0 ? '+' : ''}{formatMZN(aff.netEarnings)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Método de Saque</span>
                <span className="text-white font-bold uppercase">{aff.saqueMethod}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[#2A2F40]/30 text-xs">
              <div className="flex flex-col text-left">
                <span className="text-[9px] text-emerald-400 font-bold">{aff.saqueName || "Sem Titular"}</span>
                <span className="text-xs text-gray-400 font-mono">+{aff.saqueNumber}</span>
              </div>
              <Button 
                onClick={() => setSelectedAffiliate(aff)}
                size="sm" 
                className="h-8 bg-[#2A2F40] hover:bg-primary hover:text-black font-bold text-xs text-white cursor-pointer"
              >
                Gerir CRM
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DETALHES CRM DO PARCEIRO */}
      <Dialog open={!!selectedAffiliate} onOpenChange={(open) => !open && setSelectedAffiliate(null)}>
        <DialogContent className="sm:max-w-[600px] bg-[#101116] border-[#2A2F40] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              CRM do Parceiro: <span className="text-primary font-mono">{selectedAffiliate?.code}</span>
            </DialogTitle>
            <DialogDescription className="hidden">Visualização CRM de Afiliação</DialogDescription>
          </DialogHeader>

          {selectedAffiliate && (
            <div className="space-y-6 pt-2">
              {/* Informações Cadastrais */}
              <div className="bg-[#0B0C10] border border-[#2A2F40] p-4 rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 block font-bold uppercase tracking-wider text-[9px]">Nome do Parceiro</span>
                    <span className="text-sm font-bold text-white">{selectedAffiliate.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block font-bold uppercase tracking-wider text-[9px]">ID de Afiliado (Completo)</span>
                    <span className="text-sm font-mono font-bold text-emerald-400 select-all">{selectedAffiliate.id}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#2A2F40]/40">
                  <div>
                    <span className="text-gray-500 block font-bold uppercase tracking-wider text-[9px]">Telefone de Contato</span>
                    <span className="text-sm font-bold text-white">+{selectedAffiliate.phone}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block font-bold uppercase tracking-wider text-[9px]">E-mail</span>
                    <span className="text-sm font-bold text-white">{selectedAffiliate.email || "Sem e-mail cadastrado"}</span>
                  </div>
                </div>
              </div>

              {/* Informações Financeiras do CRM */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#0B0C10] p-3 rounded-xl border border-[#2A2F40] text-center">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Depósitos de Indicados</span>
                  <span className="text-sm font-mono font-bold text-white">{formatMZN(selectedAffiliate.totalDeposits)}</span>
                </div>
                <div className="bg-[#0B0C10] p-3 rounded-xl border border-[#2A2F40] text-center">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Comissões Diretas (50%)</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">+{formatMZN(selectedAffiliate.depositCommissions)}</span>
                </div>
                <div className="bg-[#0B0C10] p-3 rounded-xl border border-[#2A2F40] text-center">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Deduções Jogadores (50%)</span>
                  <span className="text-sm font-mono font-bold text-red-500">{formatMZN(selectedAffiliate.winDeductions)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#0B0C10] p-3 rounded-xl border border-[#2A2F40] text-center">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Passivo de Subafiliação (15%)</span>
                  <span className="text-sm font-mono font-bold text-sky-400">+{formatMZN(selectedAffiliate.subCommissions)}</span>
                </div>
                <div className="bg-[#0B0C10] p-3 rounded-xl border border-[#2A2F40] text-center">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Ganhos Líquidos</span>
                  <span className={`text-sm font-mono font-black ${selectedAffiliate.netEarnings >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                    {selectedAffiliate.netEarnings >= 0 ? '+' : ''}{formatMZN(selectedAffiliate.netEarnings)}
                  </span>
                </div>
                <div className="bg-primary/5 p-3 rounded-xl border border-primary/20 text-center">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Saldo Disponível</span>
                  <span className="text-sm font-mono font-black text-primary">{formatMZN(selectedAffiliate.balance)}</span>
                </div>
              </div>

              {/* Informações Bancárias completas */}
              <div className="bg-[#0B0C10] border border-[#2A2F40] p-4 rounded-xl">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Dados Bancários para Pagamento</h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">Método de Saque</span>
                    <span className="font-bold text-white uppercase">{selectedAffiliate.saqueMethod}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">Titular da Conta</span>
                    <span className="font-bold text-emerald-400">{selectedAffiliate.saqueName || "Sem Titular"}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">Número da Conta</span>
                    <span className="font-mono font-bold text-white select-all">+{selectedAffiliate.saqueNumber}</span>
                  </div>
                </div>
              </div>

              {/* Ações Rápidas */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ações e Contatos</h4>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant="outline" 
                    className="border-[#2A2F40] bg-[#1A1D27] hover:bg-emerald-500/20 hover:text-emerald-400 h-10 flex gap-2 font-bold text-xs"
                    onClick={() => window.open(`https://wa.me/258${selectedAffiliate.phone.replace(/\D/g, '')}`, '_blank')}
                  >
                    <MessageCircle className="w-4 h-4" /> Whatsapp
                  </Button>
                  
                  {selectedAffiliate.is_active ? (
                    <Button 
                      variant="outline" 
                      className="border-[#2A2F40] bg-[#1A1D27] hover:bg-red-500/20 hover:text-red-500 h-10 flex gap-2 font-bold text-xs"
                      onClick={() => executeAction('ban', selectedAffiliate.id)}
                    >
                      <Ban className="w-4 h-4" /> Banir Parceiro
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="border-[#2A2F40] bg-[#1A1D27] hover:bg-primary/20 hover:text-primary h-10 flex gap-2 font-bold text-xs"
                      onClick={() => executeAction('activate', selectedAffiliate.id)}
                    >
                      <UserCheck className="w-4 h-4" /> Reativar Conta
                    </Button>
                  )}

                  <Button 
                    variant="outline" 
                    className="border-[#2A2F40] bg-[#1A1D27] hover:bg-sky-500/20 hover:text-sky-400 h-10 flex gap-2 font-bold text-xs"
                    onClick={() => {
                      setSelectedAffiliate(null);
                      // Redirecionar para gerir o utilizador comum
                      window.location.href = `/admin/users?search=${selectedAffiliate.id}`;
                    }}
                  >
                    <ExternalLink className="w-4 h-4" /> Ficha de Jogador
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
