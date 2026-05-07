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
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    
    try {
      const res = await fetch("/api/payments/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numAmount, method: paymentInfo.method }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(t("error"), { description: data.error || "Erro ao processar depósito." });
        return;
      }

      toast.success(t("success"), { description: data.message });
      setDepositOpen(false);
      
      // Polling inteligente: verifica o saldo a cada 3s por até 30s
      // Garante que o saldo atualiza na UI sem F5 mesmo em modo real (webhook)
      let attempts = 0;
      const maxAttempts = 10;
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const meRes = await fetch("/api/auth/me", { cache: "no-store" });
          const meData = await meRes.json();
          if (meData.user) {
            const { updateBalance, markFirstDeposit } = useAppStore.getState();
            updateBalance(Number(meData.user.balance));
            if (meData.user.hasDeposited) {
              markFirstDeposit();
            }
            // Se o saldo mudou, parar o polling
            if (Number(meData.user.balance) !== (user?.balance || 0)) {
              clearInterval(pollInterval);
              toast.success("💰 Saldo atualizado!", { description: `Novo saldo: ${formatMZN(Number(meData.user.balance))} MZN` });
            }
          }
        } catch { /* ignorar erros de polling */ }
        if (attempts >= maxAttempts) clearInterval(pollInterval);
      }, 3000);

    } catch (error) {
      toast.error(t("error"), { description: t("depositError") });
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (Number(value) <= 25000) {
      setAmount(value);
    }
  };

  return (
    <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center glow-primary text-primary mb-2">
            {t("depositTitle")}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t("depositInfo")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
              disabled={loading}
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
                disabled={loading}
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

          <Button type="submit" className="w-full h-14 text-lg mt-2" disabled={loading}>
            {loading ? t("processing") : `${t("deposit")} ${formatMZN(Number(amount) || 0)} via ${paymentInfo.label}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
