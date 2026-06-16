import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Settings, Ban, UserCheck, ShieldAlert, Wallet, Percent, Users, MessageCircle, ExternalLink, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatMZN, cleanMocambiquePhone } from "@/lib/utils";

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
}

export function AdminAffiliatesTable({ initialAffiliates }: { initialAffiliates: AffiliateData[] }) {
  const router = useRouter();
  const [affiliates, setAffiliates] = useState<AffiliateData[]>(initialAffiliates);
  const [search, setSearch] = useState("");

  // Ações de afiliado individual migradas para a página de detalhes /admin/affiliates/[id]

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
                <th className="px-6 py-4">Ganhos / Pago</th>
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
                  <td className="px-6 py-4 align-middle font-mono text-xs">
                    <div className="text-primary font-black text-sm">{formatMZN(aff.balance)} Ganhos</div>
                    <div className="text-[10px] text-gray-400">Total Pago: {formatMZN(aff.totalPaid || 0)}</div>
                  </td>
                  <td className="px-6 py-4 align-middle text-xs">
                    <span className="font-bold text-white uppercase">{aff.saqueMethod}</span>
                    <span className="block text-[10px] text-emerald-400 font-bold">{aff.saqueName || "Sem Titular"}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-gray-400 font-mono">{cleanMocambiquePhone(aff.saqueNumber)}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-5 h-5 text-gray-400 hover:text-white p-0 cursor-pointer"
                        onClick={() => {
                          navigator.clipboard.writeText(cleanMocambiquePhone(aff.saqueNumber));
                          toast.success("Número de saque copiado!");
                        }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right align-middle">
                    <Button 
                      onClick={() => router.push(`/admin/affiliates/${aff.id}`)}
                      size="sm" 
                      className="h-8 bg-[#2A2F40] hover:bg-primary hover:text-black font-bold text-white transition-all border-none cursor-pointer"
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
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-gray-400 font-mono">{cleanMocambiquePhone(aff.saqueNumber)}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-5 h-5 text-gray-400 hover:text-white p-0 cursor-pointer"
                    onClick={() => {
                      navigator.clipboard.writeText(cleanMocambiquePhone(aff.saqueNumber));
                      toast.success("Número de saque copiado!");
                    }}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <Button 
                onClick={() => router.push(`/admin/affiliates/${aff.id}`)}
                size="sm" 
                className="h-8 bg-[#2A2F40] hover:bg-primary hover:text-black font-bold text-xs text-white cursor-pointer"
              >
                Gerir CRM
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DETALHES CRM DO PARCEIRO REMOVIDO EM PROL DA ROTA /admin/affiliates/[id] */}
    </div>
  );
}
