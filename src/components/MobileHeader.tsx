"use client";

import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { User, Wallet, LogOut, Menu, MessageCircle } from "lucide-react";
import { formatMZN } from "@/lib/utils";
import Link from "next/link";

export function MobileHeader() {
  const { t, locale, setLocale } = useTranslation();
  const { isLoggedIn, user, setRegisterOpen, setDepositOpen, setChatOpen, logout } = useAppStore();

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
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,255,127,0.3)]">
          <span className="text-black font-extrabold text-lg">M</span>
        </div>
        <span className="text-lg font-extrabold tracking-tight hidden sm:block">
          MOZ<span className="text-primary">BET</span>
        </span>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2">
        {/* Toggle Idioma */}
        <button
          onClick={() => setLocale(locale === "pt" ? "en" : "pt")}
          className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors mr-1"
        >
          {locale === "pt" ? "EN" : "PT"}
        </button>

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
                  className="w-9 h-9 rounded-full bg-surface"
                  title="Perfil"
                >
                  <User className="w-4 h-4 text-muted-foreground" />
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
              onClick={() => setRegisterOpen(true)}
            >
              {t("enter")}
            </Button>
            <Button
              size="sm"
              className="text-xs h-9 shadow-[0_0_15px_rgba(0,255,127,0.3)]"
              onClick={() => setRegisterOpen(true)}
            >
              {t("register")}
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
