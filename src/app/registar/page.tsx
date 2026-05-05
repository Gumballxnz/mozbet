"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";

export default function RegistarPage() {
  const { isLoggedIn, openRegister } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn) {
      router.replace("/");
    } else {
      openRegister();
      router.replace("/");
    }
  }, [isLoggedIn, openRegister, router]);

  return null;
}
