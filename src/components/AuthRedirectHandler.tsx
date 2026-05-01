"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";

export function AuthRedirectHandler() {
  const searchParams = useSearchParams();
  const { openLogin } = useAppStore();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "unauthorized") {
      openLogin();
    }
  }, [searchParams, openLogin]);

  return null; // Não renderiza nada visualmente
}
