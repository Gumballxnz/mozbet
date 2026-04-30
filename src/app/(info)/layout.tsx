import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function InfoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Fixo */}
      <header className="sticky top-0 z-40 bg-surface-elevated/80 backdrop-blur-md border-b border-border h-14 flex items-center px-4">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium text-sm">Voltar ao Início</span>
        </Link>
      </header>
      
      {/* Container de Conteúdo */}
      <main className="max-w-3xl mx-auto px-4 py-8 pb-32">
        <div className="prose prose-invert prose-emerald max-w-none">
          {children}
        </div>
      </main>
    </div>
  );
}
