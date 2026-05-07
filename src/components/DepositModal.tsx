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
    }}>
      <DialogContent className="sm:max-w-[400px]">
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
          
          {/* Seletor Visual de Operadora (Apenas Decorativo/Indicativo) */}
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentInfo.method === 'emola' ? 'bg-[#ff5b00]/10 border-[#ff5b00] ring-1 ring-[#ff5b00]/50 opacity-100' : 'bg-gray-800/30 border-gray-700 opacity-50 grayscale'}`}>
              <span className="text-2xl mb-1">🟢</span>
              <span className="font-black text-white tracking-wider text-sm">E-MOLA</span>
            </div>
            <div className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentInfo.method === 'mpesa' ? 'bg-[#df0000]/10 border-[#df0000] ring-1 ring-[#df0000]/50 opacity-100' : 'bg-gray-800/30 border-gray-700 opacity-50 grayscale'}`}>
              <span className="text-2xl mb-1">🔴</span>
              <span className="font-black text-white tracking-wider text-sm">M-PESA</span>
            </div>
          </div>

          {/* Telefone registado (bloqueado) */}
          <div className="space-y-2">
            <Label htmlFor="deposit-phone">{t("phone")}</Label>
            <div className="relative opacity-80">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">
                +258
              </span>
              <Input
                id="deposit-phone"
                type="tel"
                className="pl-14 font-mono-data bg-secondary/50 cursor-not-allowed"
                value={phone}
                disabled
              />
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
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 border-4 border-primary flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <DialogTitle className="text-2xl font-black tracking-wider text-white">
              PEDIDO ENVIADO!
            </DialogTitle>
            
            <p className="text-sm text-gray-400 max-w-[280px]">
              Pedido de depósito de <strong className="text-white">{formatMZN(Number(amount))}</strong> enviado com sucesso! Por favor, confirme com o PIN no seu telemóvel.
            </p>
            
            <Button 
              onClick={handleClose}
              className="w-full h-12 text-md font-bold bg-primary hover:bg-primary/90 text-primary-foreground mt-4"
            >
              OK, ENTENDI
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
