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
