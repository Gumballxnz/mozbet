"use client";
 
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
 
export default function RegistarPage() {
  const { isLoggedIn, openRegister } = useAppStore();
  const router = useRouter();
 
  useEffect(() => {
    // Rastreamento redundante no client-side
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) {
        localStorage.setItem("affiliate_ref", ref);
        // Salva também o cookie via JS por garantia extra
        document.cookie = `affiliate_pid=${ref}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
      }
    }

    if (isLoggedIn) {
      router.replace("/");
    } else {
      openRegister();
      router.replace("/");
    }
  }, [isLoggedIn, openRegister, router]);
 
  return null;
}
