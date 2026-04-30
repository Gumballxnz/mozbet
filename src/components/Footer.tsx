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
          <h3 className="text-left text-lg font-bold text-white mb-4">Payments</h3>
          <div className="flex gap-4">
            <div className="flex flex-col items-center justify-center bg-[#252031] rounded-xl w-28 h-20 border border-white/5 shadow-inner">
              <SmartphoneNfc className="w-8 h-8 text-white/60 mb-1" strokeWidth={1.5} />
              <span className="text-white/80 font-bold text-sm">m-pesa</span>
            </div>
            <div className="flex flex-col items-center justify-center bg-[#252031] rounded-xl w-28 h-20 border border-white/5 shadow-inner">
              <SmartphoneNfc className="w-8 h-8 text-white/60 mb-1" strokeWidth={1.5} />
              <span className="text-white/80 font-bold text-sm">e-Mola</span>
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
