"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/hooks/useTranslation";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { formatMZN } from "@/lib/utils";
import { EMOLA_LOGO, MPESA_LOGO } from "@/lib/logos";
import { Wallet, Check } from "lucide-react";

const AMOUNTS = [10, 50, 100, 500, 1000, 5000];

/**
 * Detecta automaticamente o método de pagamento com base no prefixo do número.
 * Regra de negócio: O utilizador SÓ pode depositar com o método da sua operadora.
 * - Vodacom (84, 85) → M-Pesa
 * - Movitel (86, 87) → E-Mola
 */
function detectPaymentMethod(phone: string): { method: "mpesa" | "emola"; label: string; icon: string } {
  const clean = phone.replace(/\D/g, "").replace(/^258/, "");
  const prefix = clean.substring(0, 2);

  if (["84", "85"].includes(prefix)) {
    return { method: "mpesa", label: "M-Pesa", icon: "🔴" };
  }
  if (["86", "87"].includes(prefix)) {
    return { method: "emola", label: "E-Mola", icon: "🟢" };
  }
  // Fallback para outros prefixos (82, 83, 88) — M-Pesa por defeito
  return { method: "mpesa", label: "M-Pesa", icon: "🔴" };
}

export function DepositModal() {
  const { t } = useTranslation();
  const { depositOpen, setDepositOpen, user } = useAppStore();

  const [amount, setAmount] = useState<string>("100");
  const [step, setStep] = useState<"form" | "sent">("form");

  // Telefone registado na conta — não pode ser alterado
  const phone = user?.phone || "";

  // Detecção automática do método de pagamento pelo prefixo do número
  const paymentInfo = useMemo(() => detectPaymentMethod(phone), [phone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 1 || numAmount > 25000) {
      toast.error(t("error"), { description: t("depositMin") });
      return;
    }

    // Muda imediatamente a UI para o modo "Pedido Enviado" (não bloqueia o utilizador)
    setStep("sent");
    
    // Inicia a transação síncrona com a e2Payments em background
    fetch("/api/payments/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: numAmount, method: paymentInfo.method }),
    })
    .then(async (res) => {
      const data = await res.json();
      
      if (!res.ok) {
        toast.error("Erro no Pagamento", { description: data.error || "Ocorreu um erro no processamento." });
        return;
      }
      
      // Quando retorna com sucesso, buscar o novo saldo real
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.user) {
          const { updateBalance, markFirstDeposit } = useAppStore.getState();
          updateBalance(Number(meData.user.balance));
          if (meData.user.hasDeposited) {
            markFirstDeposit();
          }
          toast.success("💰 Depósito Concluído!", { 
            description: `A tua conta foi carregada com sucesso. Saldo atual: ${formatMZN(Number(meData.user.balance))}` 
          });
        }
      }
    })
    .catch((error) => {
      toast.error("Erro de Ligação", { description: "Verifica a tua internet e tenta novamente." });
    });
  };

  const handleClose = () => {
    setDepositOpen(false);
    setTimeout(() => setStep("form"), 300); // reset after animation
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (Number(value) <= 25000) {
      setAmount(value);
    }
  };

  return (
    <Dialog open={depositOpen} onOpenChange={(open) => {
      setDepositOpen(open);
      if (!open) setTimeout(() => setStep("form"), 300);
      else setAmount("100");
    }}>
      <DialogContent className="sm:max-w-[400px] !top-4 !translate-y-0 sm:!top-[50%] sm:!translate-y-[-50%] max-h-[90vh] overflow-y-auto">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl text-center glow-primary text-primary mb-2">
                {t("depositTitle")}
              </DialogTitle>
              <DialogDescription className="text-center">
                Após clicar em Depositar, aguarde a notificação no seu telemóvel e confirme o pagamento inserindo seu PIN.
              </DialogDescription>
            </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          
          {/* Seletor Visual de Operadora (Com Logos Estilizados) */}
          <div className="grid grid-cols-2 gap-3 mb-2">
            
            {/* E-MOLA BUTTON */}
            <div 
              onClick={() => {
                if (paymentInfo.method !== 'emola') {
                  toast.error("Operadora Incorreta", { description: "O teu número de telemóvel está registado como M-Pesa. Não podes depositar via e-Mola." });
                }
              }}
              className={`flex items-center justify-center p-1 rounded-md transition-all cursor-pointer bg-white ${paymentInfo.method === 'emola' ? 'border-2 border-green-500 ring-2 ring-green-500/30 opacity-100 scale-105 z-10 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border border-gray-300 opacity-60 grayscale hover:grayscale-0 hover:opacity-100'}`}
            >
              <img src={EMOLA_LOGO} alt="E-Mola" className="h-12 w-auto object-contain" />
            </div>

            {/* M-PESA BUTTON */}
            <div 
              onClick={() => {
                if (paymentInfo.method !== 'mpesa') {
                  toast.error("Operadora Incorreta", { description: "O teu número de telemóvel está registado como e-Mola. Não podes depositar via M-Pesa." });
                }
              }}
              className={`flex items-center justify-center p-1 rounded-md transition-all cursor-pointer bg-white ${paymentInfo.method === 'mpesa' ? 'border-2 border-green-500 ring-2 ring-green-500/30 opacity-100 scale-105 z-10 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border border-gray-300 opacity-60 grayscale hover:grayscale-0 hover:opacity-100'}`}
            >
              <img src={MPESA_LOGO} alt="M-Pesa" className="h-12 w-auto object-contain" />
            </div>

          </div>



          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="amount">{t("betAmount")} (MZN)</Label>
            <Input
              id="amount"
              type="text"
              inputMode="numeric"
              className="font-mono-data text-xl h-14 text-center font-bold"
              value={amount}
              onChange={handleAmountChange}
              required
            />
          </div>

          {/* Atalhos de valores */}
          <div className="grid grid-cols-3 gap-2">
            {AMOUNTS.map((val) => (
              <Button
                key={val}
                type="button"
                variant="outline"
                className={`font-mono-data ${Number(amount) === val ? 'bg-primary/20 border-primary text-primary' : ''}`}
                onClick={() => setAmount(val.toString())}
              >
                {val}
              </Button>
            ))}
          </div>

          {/* Bónus de 1º depósito */}
          {!user?.hasDeposited && (
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 flex flex-col items-center justify-center mb-2">
              <span className="text-primary font-bold text-sm glow-primary">{t("firstDepositBonus")}</span>
              <span className="text-xs text-muted-foreground text-center">{t("firstDepositBonusDesc")}</span>
            </div>
          )}
            <Button
            type="submit"
            className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all"
          >
            DEPOSITAR
          </Button>
        </form>
        </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center pb-2">
            
            {/* Header de Sucesso parecido com a Whapro */}
            <div className="w-full flex items-center justify-start mb-10 pb-4 border-b border-[#2A2F40]/30 -mt-2">
               <Wallet className="w-5 h-5 text-primary mr-2" />
               <h2 className="text-xl font-bold font-mono-data tracking-wider text-white">DEPOSITAR</h2>
            </div>

            {/* Ícone de Sucesso Pulse */}
            <div className="relative w-28 h-28 flex items-center justify-center mb-8 mt-2">
               <div className="absolute inset-0 bg-primary/5 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
               <div className="absolute inset-2 bg-primary/10 rounded-full" />
               <div className="absolute inset-5 bg-[#101116] rounded-full border border-primary/20" />
               
               <div className="relative w-14 h-14 rounded-full border-[3px] border-primary flex items-center justify-center bg-[#101116] shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                 <Check className="w-6 h-6 text-primary" strokeWidth={4} />
               </div>
            </div>
            
            {/* Título de Sucesso */}
            <DialogTitle className="text-2xl font-black font-mono-data tracking-widest text-white uppercase mb-3">
              PEDIDO ENVIADO!
            </DialogTitle>
            
            {/* Mensagem Explicativa */}
            <p className="text-[11px] text-gray-400 max-w-[300px] uppercase font-bold leading-relaxed mb-8">
              Pedido de depósito enviado com sucesso! Por favor, confirme o PIN no seu telemóvel para depositar. Obrigado!
            </p>
            
            {/* Botão de Fechar */}
            <Button 
              onClick={handleClose}
              className="w-full h-14 text-sm font-black bg-primary hover:bg-primary/90 text-black uppercase tracking-wider rounded-xl transition-all"
            >
              OK, ENTENDI
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
