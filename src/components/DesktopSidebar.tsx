"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Gamepad2, Flame, Heart, Rocket, 
  Target, Dices, Cherry, Swords,
  ChevronLeft, ChevronRight, Headphones, HelpCircle
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { GAMES } from "@/lib/games";

export function DesktopSidebar() {
  const pathname = usePathname();
  const { setChatOpen } = useAppStore();
  const [collapsed, setCollapsed] = useState(false);

  // Esconder a sidebar em certas páginas
  if (pathname.startsWith("/admin") || pathname.startsWith("/jogar")) return null;

  // Links do menu — todos funcionais
  const menuItems = [
    { href: "/", icon: Gamepad2, label: "Todos os Jogos", color: "text-primary" },
    { href: "/?category=crash", icon: Flame, label: "Crash Games", color: "text-orange-500" },
    { href: "/?category=casino", icon: Dices, label: "Casino", color: "text-blue-400" },
    { href: "/?category=slots", icon: Cherry, label: "Slots", color: "text-pink-500" },
  ];

  // Jogos em destaque — links diretos para jogar
  const featuredGames = [
    { game: GAMES.find(g => g.id === "aviator")!, icon: Rocket, color: "text-red-500" },
    { game: GAMES.find(g => g.id === "taxi-crash")!, icon: Rocket, color: "text-purple-500" },
    { game: GAMES.find(g => g.id === "mines")!, icon: Target, color: "text-yellow-500" },
    { game: GAMES.find(g => g.id === "plinko")!, icon: Dices, color: "text-cyan-400" },
  ];

  // Links de páginas informativas reais
  const infoLinks = [
    { href: "/sobre", label: "Sobre Nós" },
    { href: "/termos", label: "Termos" },
    { href: "/privacidade", label: "Privacidade" },
    { href: "/jogo-responsavel", label: "Jogo Responsável" },
  ];

  return (
    <aside className={`hidden lg:flex flex-col bg-surface border-r border-white/5 h-screen sticky top-0 overflow-y-auto custom-scrollbar transition-all duration-300 ${
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
              const isActive = pathname === item.href || (item.href !== "/" && pathname.includes(item.href));
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5 hover:text-white"
                  } ${collapsed ? "justify-center px-0" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${item.color}`} />
                  {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* DESTAQUES — Links diretos para jogar */}
        <div>
          {!collapsed && <h3 className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Destaques</h3>}
          <nav className="space-y-0.5">
            {featuredGames.map(({ game, icon: Icon, color }) => (
              <Link key={game.id} href={`/jogar/${game.id}?mode=demo`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-white transition-colors ${collapsed ? "justify-center px-0" : ""}`}
                title={collapsed ? game.name : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
                {!collapsed && <span className="font-medium text-sm">{game.name}</span>}
              </Link>
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

      {/* Botão de Suporte no fundo */}
      <div className="p-3 border-t border-white/5">
        <button 
          onClick={() => setChatOpen(true)}
          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors ${collapsed ? "justify-center px-0" : ""}`}
          title={collapsed ? "Suporte" : undefined}
        >
          <Headphones className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Suporte ao Vivo</span>}
        </button>
      </div>
    </aside>
  );
}
