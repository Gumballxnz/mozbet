"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  X, Gamepad2, Flame, Dices, Cherry, Rocket, 
  Target, Headphones, HelpCircle, Shield, User, LogOut
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { GAMES } from "@/lib/games";

export function MobileSidebar() {
  const pathname = usePathname();
  const { 
    mobileSidebarOpen, setMobileSidebarOpen, 
    setChatOpen, isLoggedIn, user, logout 
  } = useAppStore();

  // Fechar ao mudar de página
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

  // Bloquear scroll do body quando aberto
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileSidebarOpen]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      logout();
      setMobileSidebarOpen(false);
    } catch {
      console.error("Erro ao sair");
    }
  };

  // Jogos em destaque
  const featuredGames = [
    { game: GAMES.find(g => g.id === "aviator")!, icon: Rocket, color: "text-red-500" },
    { game: GAMES.find(g => g.id === "mines")!, icon: Target, color: "text-yellow-500" },
    { game: GAMES.find(g => g.id === "plinko")!, icon: Dices, color: "text-cyan-400" },
  ];

  return (
    <>
      {/* Overlay escuro */}
      <div 
        className={`fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 lg:hidden ${
          mobileSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* Drawer lateral */}
      <div className={`fixed top-0 left-0 bottom-0 w-[280px] bg-surface border-r border-white/5 z-50 overflow-y-auto transition-transform duration-300 ease-out lg:hidden ${
        mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        
        {/* Header do Drawer */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <Link href="/" className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="text-primary glow-primary text-2xl leading-none">M</span>
            </div>
            MOZ<span className="text-primary glow-primary">BET</span>
          </Link>
          <button 
            onClick={() => setMobileSidebarOpen(false)}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Perfil do Utilizador (se logado) */}
        {isLoggedIn && user && (
          <div className="p-4 border-b border-white/5">
            <Link href="/perfil" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">+258 {user.phone}</p>
                <p className="text-xs text-muted-foreground">Ver perfil</p>
              </div>
            </Link>
          </div>
        )}

        <div className="p-3 space-y-5">
          {/* MENU */}
          <div>
            <h3 className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Menu</h3>
            <nav className="space-y-0.5">
              <SidebarLink href="/" icon={Gamepad2} label="Todos os Jogos" color="text-primary" active={pathname === "/" && !pathname.includes("category")} />
              <SidebarLink href="/?category=crash" icon={Flame} label="Crash Games" color="text-orange-500" active={false} />
              <SidebarLink href="/?category=casino" icon={Dices} label="Casino" color="text-blue-400" active={false} />
              <SidebarLink href="/?category=slots" icon={Cherry} label="Slots" color="text-pink-500" active={false} />
            </nav>
          </div>

          {/* DESTAQUES */}
          <div>
            <h3 className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Destaques</h3>
            <nav className="space-y-0.5">
              {featuredGames.map(({ game, icon: Icon, color }) => (
                <SidebarLink key={game.id} href={`/jogar/${game.id}?mode=demo`} icon={Icon} label={game.name} color={color} active={false} />
              ))}
            </nav>
          </div>

          {/* INFORMAÇÕES */}
          <div>
            <h3 className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Informações</h3>
            <nav className="space-y-0.5">
              <SidebarLink href="/sobre" icon={HelpCircle} label="Sobre Nós" color="text-muted-foreground" active={pathname === "/sobre"} />
              <SidebarLink href="/termos" icon={HelpCircle} label="Termos" color="text-muted-foreground" active={pathname === "/termos"} />
              <SidebarLink href="/privacidade" icon={HelpCircle} label="Privacidade" color="text-muted-foreground" active={pathname === "/privacidade"} />
              <SidebarLink href="/jogo-responsavel" icon={HelpCircle} label="Jogo Responsável" color="text-muted-foreground" active={pathname === "/jogo-responsavel"} />
            </nav>
          </div>
        </div>

        {/* Rodapé do Drawer */}
        <div className="p-3 mt-auto border-t border-white/5 space-y-2">
          {/* Suporte */}
          <button 
            onClick={() => { setChatOpen(true); setMobileSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
          >
            <Headphones className="w-5 h-5" />
            <span className="text-sm font-medium">Suporte ao Vivo</span>
          </button>

          {/* Admin (só para admins) */}
          {isLoggedIn && user && (
            <Link href="/admin/login"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
            >
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">Painel Admin</span>
            </Link>
          )}

          {/* Logout */}
          {isLoggedIn && (
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Sair da Conta</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// Componente auxiliar para links da sidebar
function SidebarLink({ href, icon: Icon, label, color, active }: {
  href: string; icon: any; label: string; color: string; active: boolean;
}) {
  return (
    <Link href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
        active ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}
