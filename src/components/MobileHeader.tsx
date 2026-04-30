"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { User, Wallet, LogOut, Menu, MessageCircle } from "lucide-react";
import { formatMZN } from "@/lib/utils";
import Link from "next/link";

export function MobileHeader() {
  const { t, locale, setLocale } = useTranslation();
  const { isLoggedIn, user, openLogin, openRegister, setChatOpen, setDepositOpen, logout } = useAppStore();
  
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAvatar(localStorage.getItem("mozbet_avatar"));
    }
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      logout();
    } catch (error) {
      console.error(error);
    }
  };

  return (
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
            <div className="flex items-center gap-1">
              <Link href="/perfil">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 rounded-full bg-surface p-0 overflow-hidden border border-white/5"
                  title="Perfil"
                >
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 rounded-full bg-surface"
                title="Chat Global"
                onClick={() => setChatOpen(true)}
              >
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
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
