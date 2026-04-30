"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Menu } from "lucide-react";
import { useAppStore } from "@/lib/store";

export function MobileNavigation() {
  const pathname = usePathname();
  const { setMobileSidebarOpen } = useAppStore();

  // Esconder a barra de navegação quando estiver a jogar ou no admin
  if (pathname.startsWith("/jogar/") || pathname.startsWith("/admin")) {
    return null;
  }

  const navItems = [
    {
      name: "Home",
      href: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      name: "Buscar",
      href: "/?category=crash",
      icon: Search,
      isActive: pathname.includes("category"),
    },
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
  ];

  return (
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
  );
}
