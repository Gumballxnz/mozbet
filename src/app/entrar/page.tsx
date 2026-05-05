"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";

export default function EntrarPage() {
  const { isLoggedIn, openLogin } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn) {
      router.replace("/");
    } else {
      openLogin();
      router.replace("/");
    }
  }, [isLoggedIn, openLogin, router]);

  return null;
}
