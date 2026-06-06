"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/useTranslation";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { formatMZN } from "@/lib/utils";
import { EMOLA_LOGO, MPESA_LOGO } from "@/lib/logos";
import { Wallet, Check, Headphones, Lock } from "lucide-react";

// Botões de valor rápido
const QUICK_AMOUNTS = [50, 100, 250, 500, 1000, 5000];

/**
 * Detecta automaticamente o método de pagamento com base no prefixo do número de telefone.
 * - Vodacom (84, 85) → M-Pesa
 * - Movitel (86, 87) → E-Mola
 */
function detectPaymentMethod(phone: string): { method: "mpesa" | "emola"; label: string } {
  const clean = phone.replace(/\D/g, "").replace(/^258/, "");
  const prefix = clean.substring(0, 2);

  if (["84", "85"].includes(prefix)) {
    return { method: "mpesa", label: "M-Pesa" };
  }
  if (["86", "87"].includes(prefix)) {
    return { method: "emola", label: "e-Mola" };
  }
  // Fallback
  return { method: "mpesa", label: "M-Pesa" };
}

export function DepositModal() {
  const { t } = useTranslation();
  const { depositOpen, setDepositOpen, depositTab, setDepositTab, user } = useAppStore();

  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState<string>("");
  const [step, setStep] = useState<"form" | "sent">("form");
  const [isLoading, setIsLoading] = useState(false);
  const [showWithdrawErrorModal, setShowWithdrawErrorModal] = useState(false);
  const [acceptBonus, setAcceptBonus] = useState(true);

  // Contador regressivo de 60 segundos após envio do depósito
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Configurações dinâmicas do backend
  const [config, setConfig] = useState({
    min_deposit: 10,
    max_deposit: 50000,
    first_deposit_bonus_percent: 500,
    default_deposit: 100,
  });

  // Validação em tempo real do depósito (valor mínimo e máximo)
  const depositError = useMemo(() => {
    if (tab !== "deposit") return null;
    const num = Number(amount);
    if (!amount || isNaN(num) || num === 0) return null;
    if (num < config.min_deposit) {
      return `O valor mínimo de depósito é de ${config.min_deposit} MT.`;
    }
    if (num > config.max_deposit) {
      return `O valor máximo de depósito é de ${config.max_deposit.toLocaleString("pt-MZ")} MT.`;
    }
    return null;
  }, [amount, tab, config.min_deposit, config.max_deposit]);

  // Validação em tempo real do levantamento (saque mínimo e saldo do usuário)
  const withdrawError = useMemo(() => {
    if (tab !== "withdraw") return null;
    const num = Number(amount);
    if (!amount || isNaN(num) || num === 0) return null;
    if (num < 65) {
      return "O valor mínimo de levantamento é de 65 MT.";
    }
    const userBalance = user?.balance || 0;
    if (num > userBalance) {
      return `Saldo insuficiente. O teu saldo disponível é de ${userBalance.toFixed(2)} MT.`;
    }
    return null;
  }, [amount, tab, user?.balance]);

  // Sincronizar aba ativa com a store global e definir valor padrão no input
  useEffect(() => {
    if (depositOpen) {
      setTab(depositTab);
      if (depositTab === "deposit") {
        setAmount(config.default_deposit.toString());
      } else {
        setAmount("");
      }
    }
  }, [depositOpen, depositTab, config.default_deposit]);

  // Busca configurações ao abrir o modal
  useEffect(() => {
    if (depositOpen) {
      fetch("/api/payments/config")
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            setConfig({
              min_deposit: data.min_deposit ?? 10,
              max_deposit: data.max_deposit ?? 50000,
              first_deposit_bonus_percent: data.first_deposit_bonus_percent ?? 500,
              default_deposit: data.default_deposit ?? 100,
            });
          }
        })
        .catch((err) => console.error("Erro ao buscar configs de depósito:", err));
    }
  }, [depositOpen]);

  // Telefone da conta do utilizador
  const phone = user?.phone || "";

  // Detecção automática de operadora pelo número de telefone
  const paymentInfo = useMemo(() => detectPaymentMethod(phone), [phone]);

  // Iniciar countdown de 60s quando o depósito for enviado com sucesso
  useEffect(() => {
    if (step === "sent" && tab === "deposit") {
      setCountdown(60);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    }
    // Para levantamento, fechar automaticamente após 5s
    if (step === "sent" && tab === "withdraw") {
      const timer = setTimeout(() => handleClose(), 5000);
      return () => clearTimeout(timer);
    }
  }, [step, tab]);

  // Formatar segundos para M:SS
  const formatCountdown = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  const handleClose = () => {
    setDepositOpen(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setTimeout(() => {
      setStep("form");
      setTab("deposit");
      setDepositTab("deposit");
      setAmount("");
      setCountdown(0);
    }, 300);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (Number(value) <= config.max_deposit) {
      setAmount(value);
    }
  };

  // Envio de Depósito
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < config.min_deposit || numAmount > config.max_deposit) {
      toast.error("Erro de Limite", {
        description: `O valor mínimo é de ${config.min_deposit} MZN e o máximo é de ${config.max_deposit} MZN por depósito.`,
      });
      return;
    }

    setIsLoading(true);
    // Ir imediatamente para a tela de aguardando para mostrar o contador de 60s
    setStep("sent");

    fetch("/api/payments/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: numAmount, method: paymentInfo.method, acceptBonus }),
    })
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          toast.error("Erro no Pagamento", { description: data.error || "Ocorreu um erro no processamento." });
          setIsLoading(false);
          setStep("form"); // Volta para o formulário se falhar
          setCountdown(0);
          return;
        }

        setIsLoading(false);
        setCountdown(0); // Para o contador e exibe o botão "OK, ENTENDI"

        // Atualizar saldo do usuário no header
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
              description: `A tua conta foi carregada com sucesso. Saldo atual: ${formatMZN(Number(meData.user.balance))}`,
            });
          }
        }
      })
      .catch(() => {
        toast.error("Erro de Ligação", { description: "Verifica a tua ligação de internet e tenta novamente." });
        setIsLoading(false);
        setStep("form");
        setCountdown(0);
      });
  };

  // Envio de Levantamento (Saque)
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = Number(amount);
    const userBalance = user?.balance || 0;

    if (isNaN(numAmount) || numAmount < 65) {
      toast.error("Erro de Valor", { description: "O valor mínimo de levantamento é 65 MT." });
      return;
    }

    if (numAmount > userBalance) {
      toast.error("Saldo Insuficiente", { description: "Não tens saldo real suficiente para este levantamento." });
      return;
    }

    setIsLoading(true);

    fetch("/api/payments/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: numAmount }),
    })
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          setIsLoading(false);
          if (data.error === "DEPOSIT_REQUIRED") {
            setShowWithdrawErrorModal(true);
          } else {
            toast.error("Erro no Saque", { description: data.error || "Ocorreu um erro ao solicitar levantamento." });
          }
          return;
        }

        setIsLoading(false);
        toast.success("⏳ Saque Solicitado!", {
          description: `O seu pedido de levantamento de ${formatMZN(numAmount)} foi enviado e está sob análise manual.`,
        });

        // Atualizar saldo do usuário localmente
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.user) {
            const { updateBalance } = useAppStore.getState();
            updateBalance(Number(meData.user.balance));
          }
        }
        
        handleClose();
      })
      .catch(() => {
        toast.error("Erro de Ligação", { description: "Verifica a tua ligação de internet e tenta novamente." });
        setIsLoading(false);
      });
  };

  return (
    <>
      <Dialog open={depositOpen} onOpenChange={(open) => {
        if (!open) handleClose();
      }}>
        <DialogContent className="sm:max-w-[450px] bg-[#141516] border border-[#2A2F40]/50 rounded-3xl p-6 shadow-2xl focus:outline-none">
          <DialogTitle className="sr-only">Depositar ou Levantar</DialogTitle>
          <DialogDescription className="sr-only">
            Escolha um valor e faça seu depósito ou levantamento de fundos de forma rápida via M-Pesa ou e-Mola.
          </DialogDescription>
          {step === "form" ? (
            <div className="flex flex-col w-full">
              {/* Abas Alternáveis (Depósito / Levantamento) */}
              <div className="flex border-b border-[#2A2F40]/30 w-full mb-6 relative">
                <button
                  type="button"
                  onClick={() => {
                    setTab("deposit");
                    setDepositTab("deposit");
                    setAmount(config.default_deposit.toString());
                  }}
                  className={`flex-1 pb-3 text-center text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    tab === "deposit" ? "text-white font-black" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  <span className="text-base">↙</span> Depósito
                  {tab === "deposit" && (
                    <div className="absolute bottom-0 left-0 w-1/2 h-[3px] bg-white rounded-t-full transition-all duration-300" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("withdraw");
                    setDepositTab("withdraw");
                    setAmount("");
                  }}
                  className={`flex-1 pb-3 text-center text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    tab === "withdraw" ? "text-white font-black" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  <span className="text-base">↗</span> Levantamento
                  {tab === "withdraw" && (
                    <div className="absolute bottom-0 right-0 w-1/2 h-[3px] bg-white rounded-t-full transition-all duration-300" />
                  )}
                </button>
              </div>

              {/* Seção 1: Método de Pagamento Detectado */}
              <div className="space-y-2 mb-6">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">
                  Método de Pagamento Detectado
                </span>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* M-PESA BUTTON */}
                  <div
                    className={`relative flex items-center justify-center p-2 h-14 rounded-2xl transition-all bg-white/5 border ${
                      paymentInfo.method === "mpesa"
                        ? "border-green-500 ring-2 ring-green-500/20 opacity-100 scale-102 shadow-[0_0_15px_rgba(34,197,94,0.15)]"
                        : "border-[#2A2F40]/30 opacity-40 grayscale"
                    }`}
                  >
                    <img src={MPESA_LOGO} alt="M-Pesa" className="h-10 w-auto object-contain" />
                    {paymentInfo.method === "mpesa" && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-black text-[9px] font-bold">
                        ✓
                      </div>
                    )}
                  </div>

                  {/* E-MOLA BUTTON */}
                  <div
                    className={`relative flex items-center justify-center p-2 h-14 rounded-2xl transition-all bg-white/5 border ${
                      paymentInfo.method === "emola"
                        ? "border-green-500 ring-2 ring-green-500/20 opacity-100 scale-102 shadow-[0_0_15px_rgba(34,197,94,0.15)]"
                        : "border-[#2A2F40]/30 opacity-40 grayscale"
                    }`}
                  >
                    <img src={EMOLA_LOGO} alt="e-Mola" className="h-10 w-auto object-contain" />
                    {paymentInfo.method === "emola" && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-black text-[9px] font-bold">
                        ✓
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center italic mt-1.5">
                  O método é detectado automaticamente pelo teu número de telemóvel.
                </p>
              </div>

              {/* Seção 2: Valor Rápido */}
              <div className="space-y-2 mb-6">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">
                  Valor Rápido
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_AMOUNTS.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val.toString())}
                      className={`h-11 rounded-xl font-mono-data text-xs font-bold transition-all border cursor-pointer hover:bg-white/10 active:scale-95 ${
                        Number(amount) === val
                          ? "bg-white/10 border-white text-white shadow-lg"
                          : "bg-white/5 border-[#2A2F40]/30 text-gray-300 hover:text-white"
                      }`}
                    >
                      {val.toLocaleString("pt-MZ")} MT
                    </button>
                  ))}
                </div>
              </div>

              {/* Seção 3: Valor do Depósito/Levantamento */}
              <form onSubmit={tab === "deposit" ? handleDepositSubmit : handleWithdrawSubmit} className="space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">
                    {tab === "deposit" ? "Valor do Depósito" : "Valor do Levantamento"}
                  </span>
                  
                  {/* Container de Entrada Customizado (Visual Concorrente) */}
                  <div className="flex items-center bg-[#101116] border border-[#2A2F40]/60 rounded-2xl overflow-hidden focus-within:border-primary/50 transition-colors h-14">
                    {/* Bloco MZN */}
                    <div className="bg-white/5 px-4 h-full flex items-center border-r border-[#2A2F40]/50 select-none">
                      <span className="font-mono-data text-sm font-black text-gray-400">MZN</span>
                    </div>
                    
                    {/* Input */}
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={amount}
                      onChange={handleAmountChange}
                      className="flex-1 bg-transparent border-0 outline-none text-center font-mono-data text-xl font-bold text-white h-full px-4 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
                      placeholder="0"
                      required
                    />

                    {/* Bloco .00 */}
                    <div className="bg-white/5 px-4 h-full flex items-center border-l border-[#2A2F40]/50 select-none">
                      <span className="font-mono-data text-sm font-black text-gray-400">.00</span>
                    </div>
                  </div>

                  {/* Legenda Dinâmica de Limites / Bónus e Erro de Validação */}
                  {tab === "deposit" ? (
                    <>
                      {depositError && (
                        <p className="text-red-500 text-[11px] font-bold mt-1 text-left animate-in fade-in">
                          {depositError}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground text-left mt-2 leading-relaxed">
                        Mínimo: {config.min_deposit} MT · Máximo: {config.max_deposit.toLocaleString("pt-MZ")} MT por depósito {!user?.hasDeposited && `· Bónus de ${config.first_deposit_bonus_percent}% (depósito #1)`}
                      </p>
                    </>
                  ) : (
                    <>
                      {withdrawError && (
                        <p className="text-red-500 text-[11px] font-bold mt-1 text-left">
                          {withdrawError}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground text-left mt-2 leading-relaxed">
                        Mínimo: 65 MT · Limite diário: 25,000 MT · Já levantado hoje: 0 MT
                      </p>
                    </>
                  )}
                </div>

                {/* Checkbox de Aceitar Bónus (Apenas no primeiro Depósito válido) */}
                {tab === "deposit" && !user?.hasDeposited && !depositError && (
                  <div 
                    className="flex items-center gap-2 mt-4 bg-white/5 border border-[#2A2F40]/30 rounded-2xl p-4 cursor-pointer select-none"
                    onClick={() => setAcceptBonus(!acceptBonus)}
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                      acceptBonus 
                        ? "bg-primary border-primary text-black" 
                        : "border-gray-500 text-transparent"
                    }`}>
                      ✓
                    </div>
                    <span className="text-xs font-bold text-gray-300">
                      Aceitar <span className="text-primary">Bónus de Boas-vindas {config.first_deposit_bonus_percent}%</span>
                    </span>
                  </div>
                )}

                {/* Campo Conta de Pagamento (Apenas no Levantamento) */}
                {tab === "withdraw" && (
                  <div className="space-y-2 text-left">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">
                      Conta de Pagamento
                    </span>
                    <div className="flex items-center justify-between bg-[#101116] border border-[#2A2F40]/60 rounded-2xl h-14 px-4 select-none opacity-80">
                      <span className="font-mono-data text-sm font-bold text-gray-300">
                        {phone.startsWith("258") ? "" : "258"}{phone} (Moçambique {paymentInfo.label})
                      </span>
                      <Lock className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>
                )}

                {/* Botão de Envio Principal (Glow Verde) */}
                <Button
                  type="submit"
                  disabled={isLoading || (tab === "deposit" ? !!depositError : !!withdrawError)}
                  className="w-full h-14 text-sm font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer select-none bg-primary hover:bg-primary/90 text-black shadow-[0_0_20px_rgba(0,255,127,0.25)] flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      A Processar...
                    </>
                  ) : tab === "deposit" ? (
                    <>
                      <span className="text-lg font-black">↙</span> Depositar via {paymentInfo.label}
                    </>
                  ) : (
                    <>
                      <span className="text-lg font-black">↗</span> Levantar via {paymentInfo.label}
                    </>
                  )}
                </Button>
              </form>
            </div>
          ) : (
            /* Tela de Confirmação de Envio com Sucesso */
            <div className="flex flex-col items-center justify-center text-center py-4">
              <div className="w-full flex items-center justify-start mb-8 pb-3 border-b border-[#2A2F40]/30">
                <Wallet className="w-5 h-5 text-primary mr-2" />
                <h2 className="text-sm font-black font-mono-data tracking-wider text-white uppercase">
                  {tab === "deposit" ? "DEPOSITAR" : "LEVANTAR"}
                </h2>
              </div>

              {/* Ícone Animado Pulse */}
              <div className="relative w-28 h-28 flex items-center justify-center mb-8">
                <div className="absolute inset-0 bg-primary/5 rounded-full animate-ping" style={{ animationDuration: "3s" }} />
                <div className="absolute inset-2 bg-primary/10 rounded-full" />
                <div className="absolute inset-5 bg-[#101116] rounded-full border border-primary/20" />
                <div className="relative w-14 h-14 rounded-full border-[3px] border-primary flex items-center justify-center bg-[#101116] shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                  <Check className="w-6 h-6 text-primary" strokeWidth={4} />
                </div>
              </div>

              <h3 className="text-xl font-black font-mono-data tracking-widest text-white uppercase mb-3">
                {tab === "deposit" ? "PEDIDO ENVIADO!" : "SOLICITAÇÃO ENVIADA!"}
              </h3>
              <p className="text-[11px] text-gray-400 max-w-[280px] uppercase font-bold leading-relaxed mb-4">
                {tab === "deposit" 
                  ? "Pedido de depósito enviado com sucesso! Por favor, insere o PIN de confirmação no teu telemóvel. Obrigado!"
                  : "Pedido de levantamento solicitado com sucesso! A transação está sob análise e será processada manualmente. Obrigado!"}
              </p>

              {/* Botão com Countdown para Depósito */}
              {tab === "deposit" && countdown > 0 ? (
                <>
                  <Button
                    disabled
                    className="relative w-full h-14 text-sm font-black bg-primary/80 text-black uppercase tracking-wider rounded-2xl cursor-default overflow-hidden flex items-center justify-center gap-2 mb-3"
                  >
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    <span>AGUARDANDO... ({formatCountdown(countdown)})</span>
                    <div
                      className="absolute bottom-0 left-0 h-1 bg-black/30"
                      style={{ width: `${(countdown / 60) * 100}%`, transition: "width 1s linear" }}
                    />
                  </Button>

                  {/* Mensagem informativa com contagem */}
                  <div className="w-full bg-[#1A1C24] border border-[#2A2F40]/40 rounded-2xl p-4 flex items-start gap-3 text-left">
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Headphones className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-300 font-bold leading-relaxed">
                        Pedido enviado — confirme o PIN no seu telemóvel para concluir o depósito.
                      </p>
                      <p className="text-primary text-[11px] font-black uppercase mt-1">
                        AGUARDE... ({formatCountdown(countdown)})
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <Button
                  onClick={handleClose}
                  className="relative w-full h-14 text-xs font-black bg-primary hover:bg-primary/90 text-black uppercase tracking-wider rounded-xl transition-all cursor-pointer overflow-hidden mt-4"
                >
                  <span className="relative z-10">OK, ENTENDI</span>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL DE ERRO DE SEGURANÇA NO LEVANTAMENTO (Fluxo original mantido) */}
      {showWithdrawErrorModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#141516] border border-[#2A2F40] rounded-2xl w-full max-w-[340px] shadow-2xl relative overflow-hidden">
            <button
              onClick={() => setShowWithdrawErrorModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div className="p-6 text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-white font-black text-lg italic tracking-widest mt-2 uppercase">
                <div className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-[10px] leading-none">!</span>
                </div>
                DEPÓSITO NECESSÁRIO
              </div>
              <p className="text-[13px] text-gray-400 font-medium leading-relaxed mt-4 px-2">
                Para garantir a segurança, você precisa realizar pelo menos um depósito hoje para habilitar a função de levantamento.
              </p>

              <div className="pt-4 space-y-3">
                <Button
                  onClick={() => {
                    setShowWithdrawErrorModal(false);
                    setTab("deposit");
                    setAmount(config.default_deposit.toString());
                  }}
                  className="w-full h-12 bg-primary text-black font-black text-sm uppercase rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 hover:scale-[1.02] transition-transform cursor-pointer"
                >
                  DEPOSITAR AGORA
                </Button>
                <Button
                  onClick={() => setShowWithdrawErrorModal(false)}
                  className="w-full h-12 bg-[#1A1C24] text-gray-400 hover:text-white font-black text-xs uppercase rounded-xl cursor-pointer"
                >
                  FECHAR
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
