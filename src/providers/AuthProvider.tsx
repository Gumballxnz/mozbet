"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, logout } = useAppStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Tenta carregar a sessão do usuário assim que o app abre
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
        setIsReady(true); // Evita flash da tela de login piscando
      }
    };

    checkSession();

    // Sincronização em tempo real do SALDO e DADOS do perfil (Ponto 8)
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

    // Contador Online Sincronizado (Ponto 1)
    const fetchOnline = async () => {
      try {
        const res = await fetch("/api/stats/online");
        const { count } = await res.json();
        useAppStore.getState().setOnlineCount(count);
      } catch (e) {}
    };
    fetchOnline();
    const onlineInterval = setInterval(fetchOnline, 60000); // Atualiza a cada 1 min

    return () => {
      if (channel) channel.then((c: any) => c && import("@/lib/supabase").then(({ supabase }) => supabase.removeChannel(c)));
      clearInterval(onlineInterval);
    };
  }, [login, logout]);

  // Enquanto está verificando a sessão no servidor, mostramos nada ou um mini-loader.
  // Isso previne que a UI mostre "Entrar" por 1 segundo e depois pisque para o perfil.
  if (!isReady) {
    return (
      <div suppressHydrationWarning className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-primary font-bold animate-pulse">MOZBET</p>
      </div>
    );
  }

  return <>{children}</>;
}
