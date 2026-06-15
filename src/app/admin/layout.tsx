"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Wallet, ArrowUpRight, LogOut, Settings, Menu, X, Percent, ShieldCheck } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAppStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Na página de login, renderizar SEM sidebar
  const isLoginPage = pathname === "/admin/login";

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      logout();
      router.push("/");
    } catch {
      toast.error("Erro ao sair");
    }
  };

  const [isNavigatingTo, setIsNavigatingTo] = useState<string | null>(null);

  // Reset do loading assim que o pathname muda (ou seja, quando a página nova carregou)
  useEffect(() => {
    setIsNavigatingTo(null);
  }, [pathname]);

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Utilizadores", href: "/admin/users", icon: Users },
    { name: "Parceiros (Afiliados)", href: "/admin/affiliates", icon: Percent },
    { name: "Equipa (Admins/Donos)", href: "/admin/team", icon: ShieldCheck },
    { name: "Depósitos", href: "/admin/transactions", icon: Wallet },
    { name: "Saques", href: "/admin/withdrawals", icon: ArrowUpRight },
    { name: "Carrossel de Destaques", href: "/admin/banners", icon: Settings },
    { name: "Catálogo de Jogos", href: "/admin/games", icon: Settings },
  ];

  // Página de login: layout limpo, sem sidebar, sem dados do admin
  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-black">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black">
      {/* Sidebar Admin */}
      <aside className="w-64 border-r border-white/10 bg-surface-elevated hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <span className="text-xl font-extrabold tracking-tight">
            MOZ<span className="text-primary glow-primary">ADMIN</span>
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const isLoading = isNavigatingTo === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (pathname !== item.href) setIsNavigatingTo(item.href);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive 
                    ? "bg-primary text-black font-bold" 
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                }`}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 bg-primary/20 text-primary rounded-full flex items-center justify-center font-bold">
              A
            </div>
            <div className="text-sm">
              <p className="font-bold text-white">Admin</p>
              <p className="text-xs text-muted-foreground">{user?.phone ? `+258 ${user.phone}` : ''}</p>
            </div>
          </div>
          <Button 
            variant="destructive" 
            className="w-full justify-start text-red-500 bg-red-500/10 hover:bg-red-500/20"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair do Painel
          </Button>
        </div>
      </aside>

      {/* Sidebar Mobile (Drawer Overlay) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Background overlay desfocado */}
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Painel lateral do drawer */}
          <aside className="relative w-64 max-w-[80vw] bg-surface-elevated border-r border-white/10 flex flex-col h-full animate-in slide-in-from-left duration-200">
            <div className="h-16 flex items-center justify-between px-6 border-b border-white/10">
              <span className="text-xl font-extrabold tracking-tight">
                MOZ<span className="text-primary glow-primary">ADMIN</span>
              </span>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 hover:bg-white/5 rounded text-muted-foreground hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                const isLoading = isNavigatingTo === item.href;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      if (pathname !== item.href) setIsNavigatingTo(item.href);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive 
                        ? "bg-primary text-black font-bold" 
                        : "text-muted-foreground hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-8 h-8 bg-primary/20 text-primary rounded-full flex items-center justify-center font-bold">
                  A
                </div>
                <div className="text-sm">
                  <p className="font-bold text-white">Admin</p>
                  <p className="text-xs text-muted-foreground">{user?.phone ? `+258 ${user.phone}` : ''}</p>
                </div>
              </div>
              <Button 
                variant="destructive" 
                className="w-full justify-start text-red-500 bg-red-500/10 hover:bg-red-500/20 cursor-pointer"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair do Painel
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Topbar */}
        <header className="h-16 border-b border-white/10 bg-surface-elevated flex md:hidden items-center px-4 gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 hover:bg-white/5 rounded text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-lg font-extrabold tracking-tight">
            MOZ<span className="text-primary glow-primary">ADMIN</span>
          </span>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
