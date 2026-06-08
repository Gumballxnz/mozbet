"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { 
  Gamepad2, Flame, Heart, Rocket, 
  Target, Dices, Cherry, Swords,
  ChevronLeft, ChevronRight, Headphones, HelpCircle, Shield
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/hooks/useTranslation";
import { GAMES } from "@/lib/games";
import { toast } from "sonner";
import { playSound } from "@/lib/sounds";
import { Globe } from "lucide-react";

export function DesktopSidebar() {
  const { locale, setLocale } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSupportOpen, isLoggedIn, user } = useAppStore();
  const [collapsed, setCollapsed] = useState(false);

  // Esconder a sidebar em certas páginas
  if (pathname && (pathname.startsWith("/admin") || pathname.startsWith("/jogar"))) return null;

  // Links do menu — todos funcionais
  const menuItems = [
    { id: "all", icon: Gamepad2, label: "Todos os Jogos", color: "text-primary" },
    { id: "crash", icon: Flame, label: "Crash Games", color: "text-orange-500" },
    { id: "casino", icon: Dices, label: "Casino", color: "text-blue-400" },
    { id: "slots", icon: Cherry, label: "Slots", color: "text-pink-500" },
  ];

  const handleMenuClick = (id: string) => {
    if (id === "all") {
      router.push("/");
    } else {
      router.push(`/?category=${id}`);
    }
  };

  const handleGameClick = (gameId: string) => {
    if (!isLoggedIn) {
      useAppStore.getState().openRegister();
      return;
    }

    if (!user?.isAdmin && (user?.balance || 0) <= 0) {
      playSound('notification');
      toast.error("Saldo Insuficiente", {
        description: "Adicione saldo à sua conta para jogar.",
        action: {
          label: "Depositar",
          onClick: () => useAppStore.getState().setDepositOpen(true),
        },
        actionButtonStyle: {
          backgroundColor: "#00ff7f",
          color: "#000",
          fontWeight: "bold",
          padding: "10px 20px",
        }
      });
      return;
    }

    router.push(`/jogar/${gameId}`);
  };

  // Jogos em destaque — links diretos para jogar
  const featuredGames = [
    { game: GAMES.find(g => g.id === "aviator")!, icon: Rocket, color: "text-red-500" },
    { game: GAMES.find(g => g.id === "taxi-crash")!, icon: Rocket, color: "text-purple-500" },
    { game: GAMES.find(g => g.id === "mines")!, icon: Target, color: "text-yellow-500" },
    { game: GAMES.find(g => g.id === "plinko")!, icon: Dices, color: "text-cyan-400" },
  ];

  // Links de páginas informativas reais
  const infoLinks = [
    { href: "/sobre-nos", label: "Sobre Nós" },
    { href: "/termos-e-condicoes", label: "Termos" },
    { href: "/politica-de-privacidade", label: "Privacidade" },
    { href: "/jogo-responsavel", label: "Jogo Responsável" },
  ];

  return (
    <aside className={`hidden lg:flex flex-col bg-surface border-r border-white/5 h-screen sticky top-0 overflow-y-auto scrollbar-hide transition-all duration-300 ${
      collapsed ? "w-[70px]" : "w-64"
    }`}>
      {/* Logo + Botão Colapsar */}
      <div className="p-4 h-16 flex items-center justify-between border-b border-white/5">
        {!collapsed && (
          <Link href="/" className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="text-primary glow-primary text-2xl leading-none">M</span>
            </div>
            MOZ<span className="text-primary glow-primary">BET</span>
          </Link>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className={`w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors ${collapsed ? "mx-auto" : ""}`}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <div className="p-3 flex-1 space-y-5">
        {/* MENU PRINCIPAL */}
        <div>
          {!collapsed && <h3 className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Menu</h3>}
          <nav className="space-y-0.5">
            {menuItems.map((item) => {
              const activeCategory = searchParams.get("category") || "all";
              const isActive = activeCategory === item.id;
              return (
                <button 
                  key={item.id} 
                  onClick={() => handleMenuClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5 hover:text-white"
                  } ${collapsed ? "justify-center px-0" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${item.color}`} />
                  {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* DESTAQUES — Links diretos para jogar */}
        <div>
          {!collapsed && <h3 className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Destaques</h3>}
          <nav className="space-y-0.5">
            {featuredGames.map(({ game, icon: Icon, color }) => (
              <button 
                key={game.id} 
                onClick={() => handleGameClick(game.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-white transition-colors ${collapsed ? "justify-center px-0" : ""}`}
                title={collapsed ? game.name : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
                {!collapsed && <span className="font-medium text-sm">{game.name}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* PÁGINAS LEGAIS */}
        {!collapsed && (
          <div>
            <h3 className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Informações</h3>
            <nav className="space-y-0.5">
              {infoLinks.map((link) => (
                <Link key={link.href} href={link.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-white transition-colors">
                  <HelpCircle className="w-4 h-4 flex-shrink-0 opacity-50" />
                  <span className="text-xs">{link.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* Botão Admin (apenas para admins) */}
      {isLoggedIn && user?.isAdmin && (
        <div className="p-3 border-t border-white/5">
          <Link href="/admin/login" target="_blank"
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors ${collapsed ? "justify-center px-0" : ""}`}
            title={collapsed ? "Painel Admin" : undefined}
          >
            <Shield className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-bold">Painel Admin</span>}
          </Link>
        </div>
      )}

      {/* Botão de Suporte no fundo */}
      <div className="p-3 border-t border-white/5 space-y-2">
        <div className="flex items-center gap-2 px-3 py-1">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(0,255,127,0.5)]" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
            {useAppStore.getState().onlineCount} Online
          </span>
        </div>
        <button 
          onClick={() => setSupportOpen(true)}
          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors ${collapsed ? "justify-center px-0" : ""}`}
          title={collapsed ? "Suporte" : undefined}
        >
          <Headphones className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Suporte ao Vivo</span>}
        </button>
      </div>

      {/* Seletor de Idioma */}
      <div className="p-3 border-t border-white/5">
        <button 
          onClick={() => setLocale(locale === "pt" ? "en" : "pt")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface hover:bg-white/5 transition-colors border border-white/5 ${collapsed ? "justify-center px-0" : "justify-between"}`}
          title={collapsed ? "Mudar Idioma" : undefined}
        >
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-muted-foreground" />
            {!collapsed && <span className="text-sm font-medium text-muted-foreground">Idioma</span>}
          </div>
          {!collapsed && (
            <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded text-white uppercase">
              {locale}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
