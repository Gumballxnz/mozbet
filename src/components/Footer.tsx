import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { MPESA_LOGO, EMOLA_LOGO } from "@/lib/logos";

export function Footer() {
  return (
    <footer className="mt-2 border-t border-white/5 bg-surface-elevated/30 py-8 px-4 text-center">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xl font-extrabold tracking-tight text-white">
            MOZ<span className="text-primary glow-primary">BET</span>
          </span>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            A melhor plataforma de entretenimento desportivo e casino de Moçambique.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 text-xs font-semibold">
          <Link href="/sobre-nos" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:text-white hover:bg-white/10 hover:border-white/20 hover:scale-102 transition-all duration-200">
            Sobre Nós
          </Link>
          <Link href="/termos-e-condicoes" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:text-white hover:bg-white/10 hover:border-white/20 hover:scale-102 transition-all duration-200">
            Termos e Condições
          </Link>
          <Link href="/politica-de-privacidade" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:text-white hover:bg-white/10 hover:border-white/20 hover:scale-102 transition-all duration-200">
            Privacidade
          </Link>
          <Link href="/jogo-responsavel" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:text-white hover:bg-white/10 hover:border-white/20 hover:scale-102 transition-all duration-200">
            Jogo Responsável
          </Link>
        </div>

        {/* Secção de Pagamentos */}
        <div className="pt-6 pb-2">
          <h3 className="text-left text-lg font-bold text-white mb-4">Métodos de Pagamento</h3>
          <div className="flex items-center gap-6">
            <img src={MPESA_LOGO} alt="M-Pesa" className="h-8 w-auto object-contain" />
            <img src={EMOLA_LOGO} alt="e-Mola" className="h-8 w-auto object-contain" />
          </div>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-4 text-xs text-muted-foreground/50 pt-4 border-t border-white/5">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Plataforma 100% Segura</span>
          </div>
          <span className="hidden sm:inline">•</span>
          <span>© {new Date().getFullYear()} MOZBET. Todos os direitos reservados.</span>
          <span className="hidden sm:inline">•</span>
          <span>Apenas para maiores de 18 anos.</span>
        </div>
      </div>
    </footer>
  );
}
