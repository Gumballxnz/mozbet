"use client";

import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { User, Wallet, LogOut, MessageCircle, Bell } from "lucide-react";
import { formatMZN } from "@/lib/utils";
import Link from "next/link";
import { useMemo } from "react";

const AVATARS = [
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=f59e0b",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&backgroundColor=10b981",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Jack&backgroundColor=3b82f6",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Molly&backgroundColor=8b5cf6",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&backgroundColor=ef4444",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe&backgroundColor=ec4899",
];

export function MobileHeader() {
  const { t } = useTranslation();
  const { isLoggedIn, user, openLogin, openRegister, setChatOpen, setDepositOpen } = useAppStore();

  const defaultAvatar = useMemo(() => {
    if (!user) return AVATARS[0];
    // Gerar um avatar pseudo-aleatório baseado no ID do user
    const charCode = user.id.charCodeAt(0) + user.id.charCodeAt(user.id.length - 1);
    return AVATARS[charCode % AVATARS.length];
  }, [user]);
    <header className="glass sticky top-0 z-40 w-full px-4 py-3 flex items-center justify-between">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-1 active:scale-95 transition-transform">
        <span className="text-xl font-extrabold tracking-tight text-white">
          MOZ<span className="text-primary glow-primary">BET</span>
        </span>
      </Link>

      {/* Ações */}
      <div className="flex items-center gap-2">

        {isLoggedIn && user ? (
          <>
            {/* Saldo e Depósito (Logado) */}
            <div className="flex items-center bg-surface-elevated border border-border rounded-full p-1 pr-3 shadow-inner">
              <Button
                size="sm"
                className="h-7 rounded-full text-xs px-3 shadow-[0_0_10px_rgba(0,255,127,0.2)]"
                onClick={() => setDepositOpen(true)}
              >
                <Wallet className="w-3 h-3 mr-1" />
                {t("deposit")}
              </Button>
              <span className="ml-3 font-mono-data text-sm font-bold glow-primary text-primary">
                {formatMZN(user.balance)}
              </span>
            </div>

            {/* Menu Usuário */}
            <div className="flex items-center gap-1.5 ml-1">
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 rounded-full bg-transparent hover:bg-white/5 relative"
                title="Notificações"
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse border border-background"></span>
              </Button>
              
              <Link href="/perfil">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 rounded-full bg-surface p-0 overflow-hidden border-2 border-primary/50 shadow-[0_0_10px_rgba(0,255,127,0.2)]"
                  title="Perfil"
                >
                  <img src={user.avatar || defaultAvatar} alt="Avatar" className="w-full h-full object-cover" />
                </Button>
              </Link>
              
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 rounded-full bg-transparent hover:bg-white/5"
                title="Chat Global"
                onClick={() => setChatOpen(true)}
              >
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Botões (Deslogado) */}
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-9"
              onClick={() => openLogin()}
            >
              {t("enter")}
            </Button>
            <Button
              size="sm"
              className="text-xs h-9 shadow-[0_0_15px_rgba(0,255,127,0.3)]"
              onClick={() => openRegister()}
            >
              {t("register")}
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
