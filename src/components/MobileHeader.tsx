"use client";

import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { User, Wallet, LogOut, MessageCircle, Bell } from "lucide-react";
import { formatMZN } from "@/lib/utils";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

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

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  // Carregar e ouvir notificações com Server Actions (Polling seguro e leve a cada 5s)
  useEffect(() => {
    if (!user) return;

    const fetchNotifs = async () => {
      try {
        const { getLatestNotifications } = await import("@/app/actions/notifications");
        const data = await getLatestNotifications();
        
        setNotifications(data);
        if (data.some((n: any) => !n.is_read)) setHasUnread(true);
      } catch (err) {
        // Silencioso em caso de erro de rede
      }
    };
    
    // Fetch Inicial
    fetchNotifs();

    // Polling contínuo
    const interval = setInterval(fetchNotifs, 5000);

    return () => clearInterval(interval);
  }, [user]);

  const markAsRead = async () => {
    setHasUnread(false);
    if (!user) return;
    
    const unreadIds = notifications.filter(n => !n.is_read && n.user_id === user.id).map(n => n.id);
    
    // UI otimista
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    
    if (unreadIds.length > 0) {
      try {
        const { markNotificationsAsRead } = await import("@/app/actions/notifications");
        await markNotificationsAsRead(unreadIds);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const defaultAvatar = useMemo(() => {
    if (!user) return AVATARS[0];
    const charCode = user.id.charCodeAt(0) + user.id.charCodeAt(user.id.length - 1);
    return AVATARS[charCode % AVATARS.length];
  }, [user]);

  return (
    <>
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
                  onClick={() => {
                    const willShow = !showNotifications;
                    setShowNotifications(willShow);
                    if (willShow) markAsRead();
                  }}
                  className="w-9 h-9 rounded-full bg-transparent hover:bg-white/5 relative"
                  title="Notificações"
                >
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  {hasUnread && (
                    <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse border border-background"></span>
                  )}
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

      {/* Dropdown de Notificações */}
      {showNotifications && isLoggedIn && (
        <div className="fixed top-[60px] right-4 w-[300px] z-50 bg-surface-elevated border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4">
          <div className="p-3 border-b border-white/5 bg-black/40">
            <h3 className="font-bold text-sm text-white flex justify-between items-center">
              Notificações
              <button onClick={() => setShowNotifications(false)} className="text-muted-foreground hover:text-white">✕</button>
            </h3>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-xs">
                Sem notificações no momento.
              </div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className={`p-4 hover:bg-white/5 transition-colors cursor-pointer border-l-2 ${notif.is_read ? 'border-transparent' : 'border-primary'}`}>
                  <h4 className="font-bold text-sm text-white mb-1 capitalize">{notif.type || "Notificação"}</h4>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {notif.message}
                  </p>
                  <span className="text-[10px] text-gray-500 mt-2 block">
                    {new Date(notif.created_at).toLocaleDateString('pt-MZ')} às {new Date(notif.created_at).toLocaleTimeString('pt-MZ', {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
