"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  TrendingUp, Users, Wallet, CreditCard, Copy, LogOut, Check,
  Settings, HelpCircle, Code, BarChart2, ShieldAlert
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
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, campanhas, definicoes, suporte
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
      // Deletar o cookie no cliente e redirecionar
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
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-slate-300 font-sans">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span>Carregando o painel de parceiro em tempo real...</span>
      </div>
    );
  }

  if (!stats) return null;

  const directLink = `https://mozbet.online/redirect.aspx?pid=${stats.code}`;
  const directLinkWithAd = `https://mozbet.online/ad.aspx?pid=${stats.code}&redirectURL=https://mozbet.online/registar`;
  const jsScript = `<script type="text/javascript" src="https://mozbet.online/ad.aspx?pid=${stats.code}"></script>`;
  const htmlBanner = `<a href="https://mozbet.online/redirect.aspx?pid=${stats.code}"><img src="https://mozbet.online/renderimage.aspx?pid=${stats.code}" border="0" /></a>`;
  const subLink = `https://afiliados.mozbet.online/registar?sub=${stats.code}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col shrink-0">
        
        {/* LOGO */}
        <div className="p-6 border-b border-slate-800 text-center md:text-left">
          <span className="text-2xl font-black tracking-wider text-white">
            MOZ<span className="text-emerald-400">BET</span>
          </span>
          <span className="block text-[10px] text-emerald-400 font-bold tracking-widest uppercase">
            Partners Panel
          </span>
        </div>

        {/* PROFILE INFO SHORT */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 text-lg">
            {stats.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-200 truncate">{stats.name}</p>
            <p className="text-xs text-slate-500">ID: {stats.code}</p>
          </div>
        </div>

        {/* NAVIGATION MENUS */}
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === "dashboard" 
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/15" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <BarChart2 className="h-5 w-5" />
            Painel de Controlo
          </button>

          <button
            onClick={() => setActiveTab("campanhas")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === "campanhas" 
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/15" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Code className="h-5 w-5" />
            Campanhas &amp; Links
          </button>

          <button
            onClick={() => setActiveTab("suporte")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === "suporte" 
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/15" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <HelpCircle className="h-5 w-5" />
            Suporte ao Parceiro
          </button>
        </nav>

        {/* LOGOUT BUTTON */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-semibold text-sm rounded-xl transition-all duration-200 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-black text-white">
              {activeTab === "dashboard" && "Painel de Controlo"}
              {activeTab === "campanhas" && "Campanhas e AdServer URLs"}
              {activeTab === "suporte" && "Suporte ao Parceiro"}
            </h1>
            <p className="text-xs text-slate-400">
              Estatísticas e relatórios em tempo real de afiliados.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-400 font-medium">Atualizado em tempo real</span>
          </div>
        </div>

        {/* TAB CONTENT: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            
            {/* STATS CARDS GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Ganhos Disponíveis */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full" />
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Saldo Disponível</span>
                  <Wallet className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-lg md:text-2xl font-black text-white">
                  {stats.balance.toFixed(2)} <span className="text-xs text-emerald-400">MZN</span>
                </div>
                <p className="text-[10px] text-slate-500">Comissão livre para levantamento</p>
              </div>

              {/* Card 2: Receita Líquida */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Receita Líquida</span>
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-lg md:text-2xl font-black text-white">
                  {stats.totalRevenue.toFixed(2)} <span className="text-xs text-emerald-400">MZN</span>
                </div>
                <p className="text-[10px] text-slate-500">Histórico total de ganhos</p>
              </div>

              {/* Card 3: Registos */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Registos</span>
                  <Users className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-lg md:text-2xl font-black text-white">
                  {stats.registrations}
                </div>
                <p className="text-[10px] text-slate-500">Jogadores inscritos por indicação</p>
              </div>

              {/* Card 4: Subafiliados */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Subafiliados</span>
                  <Users className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-lg md:text-2xl font-black text-white">
                  {stats.subAffiliatesCount}
                </div>
                <p className="text-[10px] text-slate-500">Afiliados que usaram seu link</p>
              </div>
            </div>

            {/* DETALHE DOS GANHOS (DEPOSITOS VS DEBITOS DE VITORIA) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Comissões de depósitos */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl space-y-2">
                <p className="text-xs text-slate-400 font-bold uppercase">Ganhos por Depósitos (+50%)</p>
                <div className="text-2xl font-black text-emerald-400">
                  +{stats.depositsRevenue.toFixed(2)} <span className="text-sm">MZN</span>
                </div>
                <p className="text-xs text-slate-500">{stats.firstDeposits} jogadores efetuaram depósitos.</p>
              </div>

              {/* Débitos por vitórias */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl space-y-2">
                <p className="text-xs text-slate-400 font-bold uppercase">Débitos por Vitórias (-50%)</p>
                <div className="text-2xl font-black text-red-400">
                  {stats.playerWinsDebit.toFixed(2)} <span className="text-sm">MZN</span>
                </div>
                <p className="text-xs text-slate-500">Prêmios ganhos nos jogos pelos indicados.</p>
              </div>

              {/* Comissões de subafiliados */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl space-y-2">
                <p className="text-xs text-slate-400 font-bold uppercase">Subafiliação (+15%)</p>
                <div className="text-2xl font-black text-blue-400">
                  +{stats.subAffiliateRevenue.toFixed(2)} <span className="text-sm">MZN</span>
                </div>
                <p className="text-xs text-slate-500">Receita passiva de outros afiliados.</p>
              </div>
            </div>

            {/* RECENT ACTIVITY TABLE */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-white text-base">Atividade Recente dos Indicados</h3>
                <span className="text-xs text-slate-500">Últimas 10 transações</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Jogador (Telefone)</th>
                      <th className="px-6 py-4">Ação</th>
                      <th className="px-6 py-4 text-right">Comissão Gerada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-500">
                          Nenhuma atividade recente registrada dos seus indicados.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/20">
                          <td className="px-6 py-4 text-slate-400 text-xs">
                            {new Date(tx.created_at).toLocaleString("pt-MZ")}
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-300">
                            {tx.users?.phone ? `${tx.users.phone.slice(0, 4)}***` : "Jogador Fictício"}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                              tx.type === "DEPOSIT" 
                                ? "bg-emerald-500/10 text-emerald-400" 
                                : tx.type === "WIN" 
                                  ? "bg-red-500/10 text-red-400"
                                  : "bg-blue-500/10 text-blue-400"
                            }`}>
                              {tx.type === "DEPOSIT" && "Depósito Realizado"}
                              {tx.type === "WIN" && "Prémio Ganho"}
                              {tx.type === "SUB_COMMISSION" && "Subafiliação 15%"}
                            </span>
                          </td>
                          <td className={`px-6 py-4 font-black text-right ${
                            Number(tx.amount) >= 0 ? "text-emerald-400" : "text-red-400"
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

        {/* TAB CONTENT: CAMPANHAS / ADSERVER */}
        {activeTab === "campanhas" && (
          <div className="space-y-6">
            
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
              <h3 className="text-lg font-bold text-white">AdServer URLs &amp; Links de Divulgação</h3>
              <p className="text-xs text-slate-400">
                Usa estes links e banners no teu site ou canais de divulgação para atrair novos jogadores. Os códigos salvam cookies de 30 dias na máquina do utilizador.
              </p>

              <div className="space-y-4 pt-2">
                {/* Link Direto */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Ligação Direta (Link de Afiliado)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={directLink}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-emerald-400 font-mono focus:outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(directLink, "direct")}
                      className="px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      {copiedLink === "direct" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* JavaScript AdServer */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Script JavaScript (AdServer)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={jsScript}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 font-mono focus:outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(jsScript, "js")}
                      className="px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      {copiedLink === "js" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Código HTML (Banner Renderizado) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Código HTML - Com Banner Promocional</label>
                  <div className="flex gap-2">
                    <textarea
                      readOnly
                      rows={2}
                      value={htmlBanner}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 font-mono focus:outline-none resize-none"
                    />
                    <button
                      onClick={() => copyToClipboard(htmlBanner, "html")}
                      className="px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                    >
                      {copiedLink === "html" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Link de Subafiliados */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Link de Subafiliação (Ganhe 15% das comissões de outros parceiros)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={subLink}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-blue-400 font-mono focus:outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(subLink, "sub")}
                      className="px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      {copiedLink === "sub" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* BANNER PREVIEWS */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
              <h3 className="font-bold text-white text-base">Visualização do Banner Promocional</h3>
              <p className="text-xs text-slate-400">Este é o banner que aparecerá nos teus canais ao usar o código HTML ou o JavaScript acima:</p>
              
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 p-2">
                <img src={`/renderimage.aspx?pid=${stats.code}`} alt="MozBet Promo Banner" className="w-full h-auto rounded-lg max-w-4xl mx-auto" />
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: SUPORTE */}
        {activeTab === "suporte" && (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-6 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl">
              📞
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Central de Atendimento ao Afiliado</h3>
              <p className="text-slate-400 text-sm">
                Precisa de ajuda com faturas, relatórios ou quer negociar termos personalizados para CPA? Fale diretamente com o nosso gestor de contas de parceiros.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl inline-block">
              <span className="text-xs text-slate-500 font-bold block uppercase tracking-wider mb-2">WhatsApp Suporte</span>
              <a 
                href="https://wa.me/258865712288" 
                target="_blank" 
                className="text-2xl font-black text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                +258 86 571 2288
              </a>
            </div>

            <div className="text-xs text-slate-500 pt-4 flex items-center justify-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-emerald-500/50" />
              <span>O suporte de afiliados atende 24h por dia, 7 dias por semana.</span>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
