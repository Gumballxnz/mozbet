"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  TrendingUp, Users, Wallet, CreditCard, Copy, LogOut, Check,
  Settings, HelpCircle, Code, BarChart2, ShieldAlert, Handshake,
  ExternalLink, MessageCircle, ChevronRight
} from "lucide-react";

interface Stats {
  name: string;
  code: string;
  balance: number;
  registrations: number;
  firstDeposits: number;
  depositsRevenue: number;
  playerWinsDebit: number;
  subAffiliateRevenue: number;
  totalRevenue: number;
  subAffiliatesCount: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  created_at: string;
  referred_user_id: string;
  users?: { phone: string };
}

export default function AffiliateDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/affiliates/stats");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/afiliados/login");
          return;
        }
        throw new Error("Erro ao buscar dados.");
      }
      const data = await res.json();
      setStats(data.stats);
      setTransactions(data.recentTransactions);
    } catch (err) {
      toast.error("Erro ao carregar estatísticas.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      document.cookie = "mozbet_affiliate_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      toast.success("Sessão encerrada.");
      router.refresh();
      router.push("/afiliados/login");
    } catch (err) {
      toast.error("Erro ao sair.");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(id);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopiedLink(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center text-muted-foreground font-sans">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <span>Carregando o painel de parceiro em tempo real...</span>
      </div>
    );
  }

  if (!stats) return null;

  const directLink = `https://mozbet.online/redirect.aspx?pid=${stats.code}`;
  const jsScript = `<script type="text/javascript" src="https://mozbet.online/ad.aspx?pid=${stats.code}"></script>`;
  const htmlBanner = `<a href="https://mozbet.online/redirect.aspx?pid=${stats.code}"><img src="https://mozbet.online/renderimage.aspx?pid=${stats.code}" border="0" /></a>`;
  const subLink = `https://afiliados.mozbet.online/registar?sub=${stats.code}`;

  const navItems = [
    { id: "dashboard", icon: BarChart2, label: "Painel de Controlo" },
    { id: "campanhas", icon: Code, label: "Campanhas & Links" },
    { id: "suporte", icon: HelpCircle, label: "Suporte ao Parceiro" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR — Design MozBet */}
      <aside className="w-full md:w-64 bg-surface border-b md:border-b-0 md:border-r border-white/5 flex flex-col shrink-0">
        
        {/* LOGO — Idêntico ao DesktopSidebar da MozBet */}
        <div className="p-5 h-16 flex items-center gap-2.5 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-primary glow-primary text-2xl leading-none">M</span>
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-white">
              MOZ<span className="text-primary glow-primary">BET</span>
            </span>
            <span className="block text-[9px] text-primary font-bold tracking-[0.2em] uppercase -mt-0.5">
              Partners Panel
            </span>
          </div>
        </div>

        {/* PERFIL DO PARCEIRO */}
        <div className="p-4 bg-white/[0.02] border-b border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center font-bold text-primary text-lg">
            {stats.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">{stats.name}</p>
            <p className="text-xs text-muted-foreground font-mono">ID: {stats.code}</p>
          </div>
        </div>

        {/* MENU DE NAVEGAÇÃO */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === item.id 
                  ? "bg-white/10 text-white" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon className={`h-5 w-5 flex-shrink-0 ${activeTab === item.id ? "text-primary" : ""}`} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* BOTÃO SAIR */}
        <div className="p-3 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-semibold text-sm rounded-lg transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-white/5">
          <div>
            <h1 className="text-2xl font-black text-white">
              {activeTab === "dashboard" && "Painel de Controlo"}
              {activeTab === "campanhas" && "Campanhas e AdServer URLs"}
              {activeTab === "suporte" && "Suporte ao Parceiro"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Estatísticas e relatórios em tempo real de afiliados.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(0,255,127,0.5)]" />
            <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Atualizado em tempo real</span>
          </div>
        </div>

        {/* TAB: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            
            {/* CARDS DE ESTATÍSTICAS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Saldo Disponível */}
              <div className="surface-card p-5 rounded-2xl space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-full" />
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Saldo Disponível</span>
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                <div className="text-lg md:text-2xl font-black text-white font-mono-data">
                  {stats.balance.toFixed(2)} <span className="text-xs text-primary">MZN</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Comissão livre para levantamento</p>
              </div>

              {/* Receita Líquida */}
              <div className="surface-card p-5 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Receita Líquida</span>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div className="text-lg md:text-2xl font-black text-white font-mono-data">
                  {stats.totalRevenue.toFixed(2)} <span className="text-xs text-primary">MZN</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Histórico total de ganhos</p>
              </div>

              {/* Registos */}
              <div className="surface-card p-5 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Registos</span>
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="text-lg md:text-2xl font-black text-white font-mono-data">
                  {stats.registrations}
                </div>
                <p className="text-[10px] text-muted-foreground">Jogadores inscritos por indicação</p>
              </div>

              {/* Subafiliados */}
              <div className="surface-card p-5 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Subafiliados</span>
                  <Handshake className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-lg md:text-2xl font-black text-white font-mono-data">
                  {stats.subAffiliatesCount}
                </div>
                <p className="text-[10px] text-muted-foreground">Afiliados que usaram seu link</p>
              </div>
            </div>

            {/* DETALHE DOS GANHOS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Depósitos */}
              <div className="surface-card p-5 rounded-2xl space-y-2 border-l-2 border-l-primary">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Ganhos por Depósitos (+50%)</p>
                <div className="text-2xl font-black text-primary font-mono-data">
                  +{stats.depositsRevenue.toFixed(2)} <span className="text-sm">MZN</span>
                </div>
                <p className="text-xs text-muted-foreground">{stats.firstDeposits} jogadores efetuaram depósitos.</p>
              </div>

              {/* Débitos */}
              <div className="surface-card p-5 rounded-2xl space-y-2 border-l-2 border-l-red-500">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Débitos por Vitórias (-50%)</p>
                <div className="text-2xl font-black text-red-400 font-mono-data">
                  {stats.playerWinsDebit.toFixed(2)} <span className="text-sm">MZN</span>
                </div>
                <p className="text-xs text-muted-foreground">Prêmios ganhos nos jogos pelos indicados.</p>
              </div>

              {/* Subafiliação */}
              <div className="surface-card p-5 rounded-2xl space-y-2 border-l-2 border-l-blue-400">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Subafiliação (+15%)</p>
                <div className="text-2xl font-black text-blue-400 font-mono-data">
                  +{stats.subAffiliateRevenue.toFixed(2)} <span className="text-sm">MZN</span>
                </div>
                <p className="text-xs text-muted-foreground">Receita passiva de outros afiliados.</p>
              </div>
            </div>

            {/* TABELA DE ATIVIDADE RECENTE */}
            <div className="surface-card rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-bold text-white text-base">Atividade Recente dos Indicados</h3>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Últimas 10 transações</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-muted-foreground uppercase bg-black/20 border-b border-white/5 font-black tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Jogador (Telefone)</th>
                      <th className="px-6 py-4">Ação</th>
                      <th className="px-6 py-4 text-right">Comissão Gerada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-muted-foreground">
                          Nenhuma atividade recente registrada dos seus indicados.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 text-muted-foreground text-xs font-mono-data">
                            {new Date(tx.created_at).toLocaleString("pt-MZ")}
                          </td>
                          <td className="px-6 py-4 font-semibold text-white">
                            {tx.users?.phone ? `${tx.users.phone.slice(0, 4)}***` : "Jogador"}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                              tx.type === "DEPOSIT" 
                                ? "bg-primary/10 text-primary" 
                                : tx.type === "WIN" 
                                  ? "bg-red-500/10 text-red-400"
                                  : "bg-blue-500/10 text-blue-400"
                            }`}>
                              {tx.type === "DEPOSIT" && "Depósito Realizado"}
                              {tx.type === "WIN" && "Prémio Ganho"}
                              {tx.type === "SUB_COMMISSION" && "Subafiliação 15%"}
                            </span>
                          </td>
                          <td className={`px-6 py-4 font-black text-right font-mono-data ${
                            Number(tx.amount) >= 0 ? "text-primary" : "text-red-400"
                          }`}>
                            {Number(tx.amount) >= 0 ? "+" : ""}{Number(tx.amount).toFixed(2)} MZN
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: CAMPANHAS / ADSERVER */}
        {activeTab === "campanhas" && (
          <div className="space-y-6">
            
            <div className="surface-card p-6 rounded-2xl space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white">AdServer URLs &amp; Links de Divulgação</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Usa estes links e banners no teu site ou canais de divulgação para atrair novos jogadores. Os códigos salvam cookies de 30 dias na máquina do utilizador.
                </p>
              </div>

              <div className="space-y-4">
                {/* Link Direto */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Ligação Direta (Link de Afiliado)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={directLink}
                      className="flex-1 bg-background border border-white/5 rounded-xl px-4 py-3 text-sm text-primary font-mono-data focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                    <button
                      onClick={() => copyToClipboard(directLink, "direct")}
                      className="px-4 py-3 bg-primary hover:bg-primary/80 text-black font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      {copiedLink === "direct" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* JavaScript AdServer */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Script JavaScript (AdServer)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={jsScript}
                      className="flex-1 bg-background border border-white/5 rounded-xl px-4 py-3 text-sm text-white/70 font-mono-data focus:outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(jsScript, "js")}
                      className="px-4 py-3 bg-primary hover:bg-primary/80 text-black font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      {copiedLink === "js" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Código HTML */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Código HTML - Com Banner Promocional</label>
                  <div className="flex gap-2">
                    <textarea
                      readOnly
                      rows={2}
                      value={htmlBanner}
                      className="flex-1 bg-background border border-white/5 rounded-xl px-4 py-3 text-xs text-white/70 font-mono-data focus:outline-none resize-none"
                    />
                    <button
                      onClick={() => copyToClipboard(htmlBanner, "html")}
                      className="px-4 py-3 bg-primary hover:bg-primary/80 text-black font-bold rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                    >
                      {copiedLink === "html" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Link de Subafiliados */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Link de Subafiliação (Ganhe 15% das comissões de outros parceiros)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={subLink}
                      className="flex-1 bg-background border border-white/5 rounded-xl px-4 py-3 text-sm text-blue-400 font-mono-data focus:outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(subLink, "sub")}
                      className="px-4 py-3 bg-primary hover:bg-primary/80 text-black font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      {copiedLink === "sub" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* BANNER PREVIEW */}
            <div className="surface-card p-6 rounded-2xl space-y-4">
              <h3 className="font-bold text-white text-base">Visualização do Banner Promocional</h3>
              <p className="text-xs text-muted-foreground">Este é o banner que aparecerá nos teus canais ao usar o código HTML ou o JavaScript acima:</p>
              
              <div className="border border-white/5 rounded-xl overflow-hidden bg-background p-2">
                <img src={`/renderimage.aspx?pid=${stats.code}`} alt="MozBet Promo Banner" className="w-full h-auto rounded-lg max-w-4xl mx-auto" />
              </div>
            </div>
          </div>
        )}

        {/* TAB: SUPORTE */}
        {activeTab === "suporte" && (
          <div className="surface-card p-8 rounded-2xl space-y-6 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
              <MessageCircle className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Central de Atendimento ao Afiliado</h3>
              <p className="text-muted-foreground text-sm">
                Precisa de ajuda com faturas, relatórios ou quer negociar termos personalizados para CPA? Fale diretamente com o nosso gestor de contas de parceiros.
              </p>
            </div>

            <div className="bg-background border border-white/5 p-6 rounded-xl inline-block">
              <span className="text-[10px] text-muted-foreground font-black block uppercase tracking-wider mb-2">WhatsApp Suporte</span>
              <a 
                href="https://wa.me/258865712288" 
                target="_blank" 
                className="text-2xl font-black text-primary hover:text-primary/80 transition-colors glow-primary"
              >
                +258 86 571 2288
              </a>
            </div>

            <div className="text-xs text-muted-foreground pt-4 flex items-center justify-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-primary/50" />
              <span>O suporte de afiliados atende 24h por dia, 7 dias por semana.</span>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
