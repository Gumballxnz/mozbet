import Link from "next/link";
import { ShieldCheck, SmartphoneNfc } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-white/5 bg-surface-elevated/30 py-8 px-4 text-center">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xl font-extrabold tracking-tight text-white">
            MOZ<span className="text-primary glow-primary">BET</span>
          </span>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            A melhor plataforma de entretenimento desportivo e casino de Moçambique.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/sobre-nos" className="hover:text-white transition-colors">Sobre Nós</Link>
          <Link href="/termos-e-condicoes" className="hover:text-white transition-colors">Termos e Condições</Link>
          <Link href="/politica-de-privacidade" className="hover:text-white transition-colors">Privacidade</Link>
          <Link href="/jogo-responsavel" className="hover:text-white transition-colors">Jogo Responsável</Link>
        </div>

        {/* Secção de Pagamentos */}
        <div className="pt-6 pb-2">
          <h3 className="text-left text-lg font-bold text-white mb-4">Métodos de Pagamento</h3>
          <div className="flex gap-4">
            <div className="flex flex-col items-center justify-center bg-red-600/10 rounded-2xl w-28 h-20 border border-red-500/20 shadow-inner">
              <span className="text-red-500 font-extrabold text-lg tracking-tight mb-0.5">m-pesa</span>
              <div className="w-8 h-1 bg-red-500 rounded-full opacity-50"></div>
            </div>
            <div className="flex flex-col items-center justify-center bg-orange-500/10 rounded-2xl w-28 h-20 border border-orange-500/20 shadow-inner">
              <span className="text-orange-500 font-extrabold text-lg tracking-tight mb-0.5 italic">e-Mola</span>
              <div className="w-8 h-1 bg-orange-500 rounded-full opacity-50"></div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-4 text-xs text-muted-foreground/50 pt-4 border-t border-white/5">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Plataforma 100% Segura</span>
          </div>
          <span className="hidden sm:inline">•</span>
          <span>© 2026 MOZBET. Todos os direitos reservados.</span>
          <span className="hidden sm:inline">•</span>
          <span>Apenas para maiores de 18 anos.</span>
        </div>
      </div>
    </footer>
  );
}
