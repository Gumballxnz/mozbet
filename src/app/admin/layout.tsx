"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Wallet, LogOut, Settings } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAppStore();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      logout();
      router.push("/");
    } catch {
      toast.error("Erro ao sair");
    }
  };

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Utilizadores", href: "/admin/users", icon: Users },
    { name: "Transações", href: "/admin/transactions", icon: Wallet },
    { name: "Banners (Homepage)", href: "/admin/banners", icon: Settings },
    { name: "Catálogo de Jogos", href: "/admin/games", icon: Settings },
  ];

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
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive 
                    ? "bg-primary text-black font-bold" 
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-5 h-5" />
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
              <p className="text-xs text-muted-foreground">+258 {user?.phone}</p>
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Topbar */}
        <header className="h-16 border-b border-white/10 bg-surface-elevated flex md:hidden items-center px-4 justify-between">
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
