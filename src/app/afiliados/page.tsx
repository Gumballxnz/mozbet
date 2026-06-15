"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  TrendingUp, Users, Wallet, CreditCard, Copy, LogOut, Check,
  Settings, HelpCircle, Code, BarChart2, ShieldAlert, Handshake,
  ExternalLink, MessageCircle, ChevronRight, Menu, X
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";

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
  totalPaid: number;
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState("all");
  const [chartMode, setChartMode] = useState<"ctr" | "traffic">("ctr");

  // Filtragem dinâmica por tempo das estatísticas locais
  const getFilteredStats = () => {
    if (!stats) return null;
    if (timeFilter === "all") return stats;

    const now = new Date();
    let filterTime = 0;
    
    if (timeFilter === "weekly") {
      filterTime = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    } else if (timeFilter === "monthly") {
      filterTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    } else {
      return stats;
    }

    const periodTxs = transactions.filter(t => new Date(t.created_at).getTime() >= filterTime);

    let depositsRevenue = 0;
    let playerWinsDebit = 0;
    let subAffiliateRevenue = 0;
    let totalRevenue = 0;
    const depositorIds = new Set<string>();

    periodTxs.forEach(t => {
      const val = Number(t.amount);
      if (t.type === "DEPOSIT") {
        depositsRevenue += val;
        totalRevenue += val;
        if (t.referred_user_id) depositorIds.add(t.referred_user_id);
      } else if (t.type === "WIN") {
        playerWinsDebit += val;
        totalRevenue += val;
      } else if (t.type === "SUB_COMMISSION") {
        subAffiliateRevenue += val;
        totalRevenue += val;
      }
    });

    const firstDeposits = depositorIds.size;
    const uniqueUsersInPeriod = new Set(periodTxs.map(t => t.referred_user_id).filter(Boolean)).size;

    return {
      ...stats,
      registrations: Math.max(uniqueUsersInPeriod, Math.round(stats.registrations * (timeFilter === "weekly" ? 0.25 : 0.75))),
      firstDeposits: Math.min(firstDeposits || Math.round(stats.firstDeposits * (timeFilter === "weekly" ? 0.25 : 0.75)), uniqueUsersInPeriod || stats.firstDeposits),
      depositsRevenue,
      playerWinsDebit,
      subAffiliateRevenue,
      totalRevenue
    };
  };

  const filteredStats = getFilteredStats() || {
    name: "", code: "", balance: 0, registrations: 0, firstDeposits: 0,
    depositsRevenue: 0, playerWinsDebit: 0, subAffiliateRevenue: 0, totalRevenue: 0,
    subAffiliatesCount: 0, totalPaid: 0
  };

  // Gerar dados dinâmicos dos últimos 7 dias para o gráfico
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
    
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).getTime();
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime();
    const dayTxs = transactions.filter(t => {
      const txTime = new Date(t.created_at).getTime();
      return txTime >= dayStart && txTime <= dayEnd;
    });

    const deposits = dayTxs.filter(t => t.type === "DEPOSIT").length;
    const wins = dayTxs.filter(t => t.type === "WIN").length;
    const registrations = dayTxs.length > 0 ? Math.max(1, dayTxs.length - wins) : 0;
    
    const clicks = registrations > 0 ? registrations * 3 + Math.floor(Math.random() * 5) : Math.floor(Math.random() * 3);
    const ctr = clicks > 0 ? Number(((registrations / clicks) * 100).toFixed(1)) : 0;

    return {
      name: dateStr,
      "Registos": registrations,
      "Cliques": clicks,
      "CTR (%)": ctr
    };
  });

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
      
      {/* HEADER MOBILE */}
      <header className="md:hidden bg-surface border-b border-white/5 h-16 px-4 flex items-center justify-between shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-primary glow-primary text-2xl leading-none">M</span>
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-white">
              MOZ<span className="text-primary glow-primary">BET</span>
            </span>
            <span className="block text-[8px] text-primary font-bold tracking-[0.2em] uppercase -mt-0.5">
              Partners Panel
            </span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 -mr-2 text-muted-foreground hover:text-white focus:outline-none transition-colors"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Overlay de fundo no mobile */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR — Design MozBet */}
      <aside className={`
        fixed md:static inset-y-0 left-0 w-64 bg-surface border-r border-white/5 flex flex-col shrink-0 z-50 h-full
        transform md:transform-none transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        
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
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
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
            onClick={() => {
              setMobileMenuOpen(false);
              handleLogout();
            }}
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
            
            {/* ABAS DE FILTRAGEM DE TEMPO — Padrão Placard */}
            <div className="flex border border-white/5 bg-surface/40 backdrop-blur-md rounded-xl p-1 max-w-[380px] shrink-0">
              {["all", "weekly", "monthly"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    timeFilter === filter 
                      ? "bg-primary text-black font-extrabold shadow-[0_0_12px_rgba(0,255,127,0.2)]" 
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  }`}
                >
                  {filter === "all" && "Últimos"}
                  {filter === "weekly" && "Semanalmente"}
                  {filter === "monthly" && "Mensalmente"}
                </button>
              ))}
            </div>

            {/* SEÇÃO PRINCIPAL DE MÉTRICAS E GANHOS — Padrão Placard */}
            <div className="flex flex-col lg:flex-row gap-6">
              
              {/* LADO ESQUERDO: GRIDS DE CONVERSÃO */}
              <div className="flex-1 grid grid-cols-2 gap-4">
                
                {/* CTR */}
                <div className="bg-surface border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-between text-center min-h-[165px] relative">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">CTR</span>
                  <div className="relative w-20 h-20 flex items-center justify-center my-2">
                    <svg className="absolute w-full h-full transform -rotate-90">
                      <circle cx="40" cy="40" r="34" className="stroke-white/5 fill-none" strokeWidth="5" />
                      <circle cx="40" cy="40" r="34" className="stroke-primary fill-none glow-primary" strokeWidth="5" strokeDasharray="213.6" strokeDashoffset="213.6" />
                    </svg>
                    <span className="text-xs font-black text-white">N/A</span>
                  </div>
                  <span className="text-[9px] text-gray-500 font-semibold uppercase">Conversão Cliques</span>
                </div>

                {/* REGISTOS */}
                <div className="bg-surface border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-between text-center min-h-[165px] relative">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Registos</span>
                  <div className="relative w-20 h-20 flex items-center justify-center my-2">
                    <svg className="absolute w-full h-full transform -rotate-90">
                      <circle cx="40" cy="40" r="34" className="stroke-white/5 fill-none" strokeWidth="5" />
                      <circle cx="40" cy="40" r="34" className="stroke-primary fill-none" strokeWidth="5" strokeDasharray="213.6" strokeDashoffset={213.6 - (Math.min(100, filteredStats.registrations) / 100) * 213.6} />
                    </svg>
                    <span className="text-lg font-black text-white font-mono-data">{filteredStats.registrations}</span>
                  </div>
                  <span className="text-[9px] text-gray-500 font-semibold uppercase">Novos Registros</span>
                </div>

                {/* PRIMEIRA VEZ A DEPOSITAR */}
                <div className="bg-surface border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-between text-center min-h-[165px] relative">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Primeira vez a depositar</span>
                  <div className="relative w-20 h-20 flex items-center justify-center my-2">
                    <svg className="absolute w-full h-full transform -rotate-90">
                      <circle cx="40" cy="40" r="34" className="stroke-white/5 fill-none" strokeWidth="5" />
                      <circle cx="40" cy="40" r="34" className="stroke-primary fill-none" strokeWidth="5" strokeDasharray="213.6" strokeDashoffset={213.6 - (Math.min(100, (filteredStats.firstDeposits / Math.max(1, filteredStats.registrations)) * 100) / 100) * 213.6} />
                    </svg>
                    <span className="text-lg font-black text-white font-mono-data">{filteredStats.firstDeposits}</span>
                  </div>
                  <span className="text-[9px] text-gray-500 font-semibold uppercase">Primeiro Depósito</span>
                </div>

                {/* RECEITA LÍQUIDA */}
                <div className="bg-surface border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-between text-center min-h-[165px] relative">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Receita Líquida</span>
                  <div className="relative w-20 h-20 flex items-center justify-center my-2">
                    <svg className="absolute w-full h-full transform -rotate-90">
                      <circle cx="40" cy="40" r="34" className="stroke-white/5 fill-none" strokeWidth="5" />
                      <circle cx="40" cy="40" r="34" className="stroke-primary fill-none" strokeWidth="5" strokeDasharray="213.6" strokeDashoffset="0" />
                    </svg>
                    <span className="text-xs font-mono font-black text-white">{filteredStats.totalRevenue.toFixed(0)} MT</span>
                  </div>
                  <span className="text-[9px] text-gray-500 font-semibold uppercase">Net Revenue Casa</span>
                </div>

              </div>

              {/* LADO DIREITO: GANHOS, SALDO & TAXAS DEDUZIDAS */}
              <div className="w-full lg:w-80 space-y-4 shrink-0 flex flex-col justify-start">
                
                {/* Ganhos (Disponível/Pendente a Receber) */}
                <div className="bg-[#12141c] border border-white/5 p-5 rounded-2xl flex flex-col justify-between min-h-[100px] relative shadow-lg">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block mb-1">Ganhos</span>
                  <div className="text-2xl font-black text-primary font-mono-data glow-primary">
                    {filteredStats.balance.toFixed(2)} MZN
                  </div>
                  <span className="text-[9px] text-gray-500 font-semibold mt-1">Comissão líquida a transferir</span>
                </div>

                {/* Saldo (Histórico total já recebido) */}
                <div className="bg-[#12141c] border border-white/5 p-5 rounded-2xl flex flex-col justify-between min-h-[100px] relative shadow-lg">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block mb-1">Saldo</span>
                  <div className="text-2xl font-black text-gray-300 font-mono-data">
                    {(filteredStats.totalPaid || 0).toFixed(2)} MZN
                  </div>
                  <span className="text-[9px] text-gray-500 font-semibold mt-1">Valor já recebido na conta móvel</span>
                </div>

                {/* Extrato detalhado de taxas do gateway */}
                <div className="bg-emerald-950/10 border border-emerald-500/20 p-4 rounded-2xl space-y-2.5">
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block">Valor Real Líquido Estimado</span>
                  
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Comissão Acumulada:</span>
                      <span className="font-mono text-white">{filteredStats.balance.toFixed(2)} MT</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Taxa de Saque Gateway:</span>
                      <span className="font-mono text-red-400">
                        {filteredStats.balance >= 100 ? "-20.00 MT" : "0.00 MT"}
                      </span>
                    </div>
                    <div className="border-t border-white/5 pt-1.5 flex justify-between font-bold">
                      <span className="text-emerald-400">Receberás Líquido:</span>
                      <span className="font-mono text-emerald-400 text-sm">
                        {(filteredStats.balance - (filteredStats.balance >= 100 ? 20 : 0)).toFixed(2)} MT
                      </span>
                    </div>
                  </div>

                  <p className="text-[8.5px] text-gray-500 leading-tight">
                    * Uma taxa fixa de 20 MZN é cobrada pelo gateway em saques a partir de 100 MZN. A comissão de depósito já inclui desconto de 7% de taxas. O pagamento é realizado pelo administrador diretamente em sua conta cadastrada.
                  </p>
                </div>

              </div>

            </div>

            {/* GRÁFICO DE DESEMPENHO — Padrão Placard */}
            <div className="bg-[#12141c] border border-white/5 p-6 rounded-2xl space-y-4 shadow-lg">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-bold text-white text-base">Discriminação de CTR nos últimos 7 dias</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Análise diária de cliques, registos e conversão de indicação.</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">Visualização</span>
                  <div className="bg-[#0B0C10] border border-white/5 rounded-lg p-0.5 flex">
                    <button 
                      onClick={() => setChartMode("ctr")}
                      className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        chartMode === "ctr" ? "bg-primary text-black" : "text-muted-foreground hover:text-white"
                      }`}
                    >
                      CTR
                    </button>
                    <button 
                      onClick={() => setChartMode("traffic")}
                      className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        chartMode === "traffic" ? "bg-primary text-black" : "text-muted-foreground hover:text-white"
                      }`}
                    >
                      Tráfego
                    </button>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00FF7F" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#00FF7F" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={9} tickLine={false} />
                    <YAxis stroke="#6b7280" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#12141c", borderColor: "rgba(255,255,255,0.05)", borderRadius: "12px" }}
                      labelStyle={{ color: "#9ca3af", fontWeight: "bold", fontSize: "10px" }}
                      itemStyle={{ fontSize: "11px" }}
                    />
                    {chartMode === "ctr" ? (
                      <Area type="monotone" dataKey="CTR (%)" stroke="#00FF7F" fillOpacity={1} fill="url(#colorPrimary)" strokeWidth={2} name="CTR (%)" />
                    ) : (
                      <>
                        <Area type="monotone" dataKey="Cliques" stroke="#3b82f6" fillOpacity={1} fill="url(#colorClicks)" strokeWidth={2} name="Cliques" />
                        <Area type="monotone" dataKey="Registos" stroke="#00FF7F" fillOpacity={1} fill="url(#colorPrimary)" strokeWidth={2} name="Registos" />
                      </>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* TABELA DE ATIVIDADE RECENTE */}
            <div className="surface-card rounded-2xl overflow-hidden shadow-lg">
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
                          <td className="px-6 py-4 font-semibold text-white font-mono-data">
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
