"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, logout } = useAppStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {

    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          headers: { "Cache-Control": "no-cache" },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            login(data.user);
          } else {
            logout();
          }
        } else {
          logout();
        }
      } catch (error) {
        console.error("Erro ao verificar sessão:", error);
        logout();
      } finally {
        setIsReady(true);
      }
    };

    checkSession();

    let channel: any;
    const setupRealtime = async () => {
       const res = await fetch("/api/auth/me");
       const { user } = await res.json();
       if (user) {
         channel = import("@/lib/supabase").then(({ supabase }) => {
           return supabase.channel(`user-sync-${user.id}`)
            .on('postgres_changes', {
              event: 'UPDATE',
              schema: 'public',
              table: 'users',
              filter: `id=eq.${user.id}`
            }, (payload) => {
              const updated = payload.new;
              useAppStore.getState().login({
                id: updated.id,
                phone: updated.phone,
                email: updated.email,
                balance: Number(updated.balance),
                hasDeposited: updated.has_deposited,
                createdAt: updated.created_at,
                isAdmin: updated.is_admin,
                avatar: updated.avatar_url,
                vipLevel: updated.vip_level,
                bonusBalance: Number(updated.bonus_balance),
                unlockedBalance: Number(updated.unlocked_balance)
              });
            })
            .subscribe();
         });
       }
    };
    setupRealtime();

    const fetchOnline = async () => {
      try {
        const res = await fetch("/api/stats/online");
        const { count } = await res.json();
        useAppStore.getState().setOnlineCount(count);
      } catch (e) {}
    };
    fetchOnline();
    const onlineInterval = setInterval(fetchOnline, 60000);

    return () => {
      if (channel) channel.then((c: any) => c && import("@/lib/supabase").then(({ supabase }) => supabase.removeChannel(c)));
      clearInterval(onlineInterval);
    };
  }, [login, logout]);

  return (
    <>
      {!isReady && (
        <div className="fixed inset-0 bg-black z-[9999] flex items-center justify-center" />
      )}
      {children}
    </>
  );
}
