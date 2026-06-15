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

        {/* Seção MolaBet-style de Contato e Afiliação */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-b border-white/5 pb-6 text-left">
          <Link href="https://afiliados.mozbet.online/" target="_blank" className="flex items-center justify-between p-4 bg-slate-900/50 hover:bg-slate-900 border border-white/5 rounded-2xl group transition-all duration-200 cursor-pointer">
            <div>
              <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                🤝 Torne-se Afiliado
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Ganhe comissões por cada novo jogador
              </p>
            </div>
            <span className="text-muted-foreground group-hover:text-primary transition-colors text-lg">→</span>
          </Link>

          <div className="flex flex-col justify-center p-4 bg-slate-900/50 border border-white/5 rounded-2xl">
            <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
              ✉️ Fale Connosco
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              suporte@mozbet.online
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-900/50 border border-white/5 rounded-2xl">
            <div>
              <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                📞 Central de Atendimento
              </h4>
              <a href="tel:+258865712288" className="text-sm font-black text-primary hover:underline mt-1 block">
                +258 86 571 2288
              </a>
            </div>
          </div>
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
          <span>© 2026 MOZBET. Todos os direitos reservados.</span>
          <span className="hidden sm:inline">•</span>
          <span>Apenas para maiores de 18 anos.</span>
        </div>
      </div>
    </footer>
  );
}
