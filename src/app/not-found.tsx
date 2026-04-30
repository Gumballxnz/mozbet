"use client";

import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
      <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="w-12 h-12 text-destructive" />
      </div>
      
      <h1 className="text-6xl font-black mb-4 font-mono-data text-primary glow-primary">
        404
      </h1>
      
      <h2 className="text-2xl font-bold mb-2">Página Não Encontrada</h2>
      <p className="text-muted-foreground max-w-md mx-auto mb-8">
        A página que você está tentando acessar não existe, foi removida ou o endereço está incorreto.
      </p>
      
      <Link href="/">
        <Button size="lg" className="px-8 font-bold">
          {t("goHome")}
        </Button>
      </Link>
    </div>
  );
}
