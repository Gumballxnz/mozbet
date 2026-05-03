"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Search, Menu, X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useState } from "react";
import { GAMES } from "@/lib/games";
import { toast } from "sonner";

export function MobileNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { setMobileSidebarOpen, isLoggedIn, user } = useAppStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleGameClick = (gameId: string) => {
    if (!isLoggedIn) {
      useAppStore.getState().openRegister();
      return;
    }

    if (!user?.isAdmin && (user?.balance || 0) <= 0) {
      toast.error("Saldo Insuficiente", {
        description: "Você precisa fazer um depósito para entrar nos jogos.",
        action: {
          label: "Depositar",
          onClick: () => useAppStore.getState().setDepositOpen(true),
        }
      });
      return;
    }

    setSearchOpen(false);
    router.push(`/jogar/${gameId}`);
  };

  // Esconder a barra de navegação quando estiver a jogar ou no admin
  if (pathname.startsWith("/jogar/") || pathname.startsWith("/admin")) {
    return null;
  }

  const navItems = [
    {
      name: "Menu",
      href: "#",
      icon: Menu,
      isActive: false,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        setMobileSidebarOpen(true);
      }
    },
    {
      name: "Home",
      href: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      name: "Buscar",
      href: "#",
      icon: Search,
      isActive: false,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        setSearchOpen(true);
      }
    },
  ];

  const filteredGames = GAMES.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      {/* Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col p-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input 
                autoFocus
                type="text"
                placeholder="Procurar jogos..."
                className="w-full bg-white/10 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary transition-colors"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="p-3 bg-white/10 rounded-xl text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pb-20">
            {searchQuery && filteredGames.length === 0 && (
              <p className="text-center text-muted-foreground mt-10">Nenhum jogo encontrado.</p>
            )}
            {searchQuery && filteredGames.map(game => (
              <button 
                key={game.id}
                onClick={() => handleGameClick(game.id)}
                className="w-full flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 rounded-xl text-left transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-white/10 overflow-hidden flex-shrink-0">
                  <img src={game.banner} alt={game.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="text-white font-bold">{game.name}</h4>
                  <span className="text-xs text-primary">{game.category.toUpperCase()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden pb-safe">
      <div className="absolute inset-0 glass border-t border-border/50" />
      <div className="relative flex items-center justify-around h-[60px] px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={item.onClick}
              className="relative flex flex-col items-center justify-center w-16 h-full gap-1 active:scale-95 transition-transform"
            >
              <div
                className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                  item.isActive 
                    ? "bg-primary/20 text-primary shadow-[0_0_15px_rgba(0,255,127,0.2)]" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${item.isActive ? "glow-primary" : ""}`} />
              </div>
              <span 
                className={`text-[10px] font-bold ${
                  item.isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
    </>
  );
}
