"use client";

import { useState, useRef, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "@/hooks/useTranslation";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { isValidPhone } from "@/lib/utils";
import { Eye, EyeOff, KeyRound, ArrowLeft } from "lucide-react";

// Modos do modal
type ModalStep = "form" | "otp" | "forgot" | "forgot-otp" | "new-password";

export function RegisterModal() {
  const { t } = useTranslation();
  const { registerOpen, setRegisterOpen, login: setGlobalUser, authMode } = useAppStore();
  
  const [isLogin, setIsLogin] = useState(authMode === "login");
  const [step, setStep] = useState<ModalStep>("form");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [agreeMarketing, setAgreeMarketing] = useState(true);
  const [loading, setLoading] = useState(false);

  // OTP
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset password
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Countdown para reenvio de OTP
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // Sincronizar com o store quando o modal abre
  useEffect(() => {
    if (registerOpen) {
      setIsLogin(authMode === "login");
    }
  }, [registerOpen, authMode]);

  // Validação dinâmica do formulário
  const isFormValid = isLogin
    ? phone.length >= 8 && password.length >= 4
    : phone.length >= 8 && password.length >= 4 && password === confirmPassword && agreeTerms;

  const resetForm = () => {
    setPhone("");
    setPassword("");
    setConfirmPassword("");
    setAgreeTerms(true);
    setAgreeMarketing(true);
    setOtpValues(["", "", "", "", "", ""]);
    setResetToken("");
    setNewPassword("");
    setConfirmNewPassword("");
    setStep("form");
  };

  // ─── REGISTO / LOGIN ────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidPhone(phone)) {
      toast.error("Erro", { description: "Número de telefone inválido." });
      return;
    }

    if (password.length < 4) {
      toast.error("Erro", { description: "A senha deve ter pelo menos 4 caracteres." });
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      toast.error("Erro", { description: "As senhas não coincidem." });
      return;
    }

    if (!isLogin && !agreeTerms) {
      toast.error("Aviso", { description: "Tens de concordar com os Termos." });
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // LOGIN direto
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          toast.error("Erro", { description: data.error || "Erro ao iniciar sessão." });
          return;
        }

        toast.success("Bem-vindo de volta!");
        setGlobalUser(data.user);
        resetForm();
        setRegisterOpen(false);
      } else {
        // REGISTO
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          toast.error("Erro", { description: data.error || "Erro ao criar conta." });
          return;
        }

        if (data.pendingVerification) {
          toast.success("Código enviado!", { description: "Verifique o SMS no seu telemóvel." });
          setStep("otp");
          setOtpCountdown(60);
        } else if (data.user) {
          // OTP desativado - Login direto
          toast.success("Conta criada com sucesso!");
          setGlobalUser(data.user);
          resetForm();
          setRegisterOpen(false);
        }
      }
    } catch {
      toast.error("Erro", { description: "Erro de conexão." });
    } finally {
      setLoading(false);
    }
  };

  // ─── VERIFICAÇÃO OTP ────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newValues = [...otpValues];
    newValues[index] = value.slice(-1);
    setOtpValues(newValues);

    // Avançar automaticamente para o próximo campo
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newValues = [...otpValues];
    for (let i = 0; i < pastedData.length; i++) {
      newValues[i] = pastedData[i];
    }
    setOtpValues(newValues);
    if (pastedData.length > 0) {
      otpRefs.current[Math.min(pastedData.length, 5)]?.focus();
    }
  };

  const handleVerifyOtp = async (purpose: "register" | "reset") => {
    const code = otpValues.join("");
    if (code.length < 6) {
      toast.error("Erro", { description: "Introduza o código completo de 6 dígitos." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, purpose }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error("Erro", { description: data.error || "Código inválido." });
        return;
      }

      if (purpose === "register") {
        toast.success("Conta verificada!", { description: "Bem-vindo à MOZBET!" });
        setGlobalUser(data.user);
        resetForm();
        setRegisterOpen(false);
      } else if (purpose === "reset") {
        setResetToken(data.resetToken);
        setStep("new-password");
      }
    } catch {
      toast.error("Erro", { description: "Falha ao verificar código." });
    } finally {
      setLoading(false);
    }
  };

  // ─── REENVIAR OTP ────────────────────────────────────
  const handleResendOtp = async (purpose: "register" | "reset") => {
    if (otpCountdown > 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error("Erro", { description: data.error || "Erro ao reenviar." });
        return;
      }

      toast.success("Código reenviado!");
      setOtpValues(["", "", "", "", "", ""]);
      setOtpCountdown(60);
    } catch {
      toast.error("Erro", { description: "Falha ao reenviar código." });
    } finally {
      setLoading(false);
    }
  };

  // ─── RECUPERAR SENHA ────────────────────────────────────
  const handleForgotSend = async () => {
    if (!isValidPhone(phone)) {
      toast.error("Erro", { description: "Introduza um número válido." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "reset" }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error("Erro", { description: data.error || "Número não encontrado." });
        return;
      }

      toast.success("Código enviado!", { description: "Verifique o SMS." });
      setStep("forgot-otp");
      setOtpCountdown(60);
      setOtpValues(["", "", "", "", "", ""]);
    } catch {
      toast.error("Erro", { description: "Falha ao enviar código." });
    } finally {
      setLoading(false);
    }
  };

  // ─── REDEFINIR SENHA ────────────────────────────────────
  const handleResetPassword = async () => {
    if (newPassword.length < 4) {
      toast.error("Erro", { description: "A senha deve ter pelo menos 4 caracteres." });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("Erro", { description: "As senhas não coincidem." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error("Erro", { description: data.error || "Erro ao redefinir." });
        return;
      }

      toast.success("Senha alterada!", { description: "Pode agora iniciar sessão." });
      resetForm();
      setIsLogin(true);
    } catch {
      toast.error("Erro", { description: "Erro de conexão." });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 9) setPhone(value);
  };

  // ─── COMPONENTE OTP (6 quadradinhos) ────────────────────
  const OtpInputs = () => (
    <div className="flex justify-center gap-2 my-6" onPaste={handleOtpPaste}>
      {otpValues.map((val, idx) => (
        <input
          key={idx}
          ref={(el) => { otpRefs.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={val}
          onChange={(e) => handleOtpChange(idx, e.target.value)}
          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
          className="w-11 h-14 text-center text-2xl font-bold bg-black/40 border-2 border-white/10 rounded-lg text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
        />
      ))}
    </div>
  );

  return (
    <Dialog open={registerOpen} onOpenChange={(open) => { setRegisterOpen(open); if (!open) resetForm(); }}>
      <DialogContent className="sm:max-w-[420px] bg-[#1c1a24] border-white/5 p-6 rounded-2xl">
        <DialogDescription className="hidden">Formulário de autenticação</DialogDescription>
        
        {/* ════════ STEP: FORMULÁRIO DE LOGIN/REGISTO ════════ */}
        {step === "form" && (
          <>
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold text-white text-left">
                {isLogin ? "Iniciar Sessão" : "Registar"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Telefone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-muted-foreground text-xs">Telefone:</Label>
                <div className="relative flex items-center bg-black/40 border border-white/10 rounded-lg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                  <div className="flex items-center pl-3 pr-2 border-r border-white/10">
                    <span className="text-lg mr-1" role="img">🇲🇿</span>
                    <span className="text-white font-bold text-sm">+258</span>
                  </div>
                  <Input
                    id="phone" type="tel" placeholder="000000000"
                    className="border-none bg-transparent h-12 font-mono-data text-white focus-visible:ring-0 px-3 shadow-none"
                    value={phone} onChange={handlePhoneChange} disabled={loading} required
                  />
                </div>
                <p className="text-[10px] text-muted-foreground ml-1">ex. 841234567</p>
              </div>

              {/* Palavra-passe */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-muted-foreground text-xs">Palavra-passe:</Label>
                <div className="relative flex items-center bg-black/40 border border-white/10 rounded-lg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                  <div className="pl-3 text-muted-foreground"><KeyRound className="w-5 h-5" /></div>
                  <Input
                    id="password" type={showPassword ? "text" : "password"}
                    className="border-none bg-transparent h-12 font-mono-data text-white focus-visible:ring-0 px-3 shadow-none"
                    value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="pr-3 text-muted-foreground hover:text-white transition-colors" tabIndex={-1}>
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Repetir (só no Registo) */}
              {!isLogin && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-muted-foreground text-xs">Repetir palavra-passe:</Label>
                  <div className="relative flex items-center bg-black/40 border border-white/10 rounded-lg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                    <div className="pl-3 text-muted-foreground"><KeyRound className="w-5 h-5" /></div>
                    <Input
                      id="confirmPassword" type={showConfirmPassword ? "text" : "password"}
                      className="border-none bg-transparent h-12 font-mono-data text-white focus-visible:ring-0 px-3 shadow-none"
                      value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} required
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="pr-3 text-muted-foreground hover:text-white transition-colors" tabIndex={-1}>
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Checkboxes (só no Registo) */}
              {!isLogin && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-start space-x-3">
                    <Checkbox id="terms" checked={agreeTerms} onCheckedChange={(c) => setAgreeTerms(c as boolean)}
                      className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:text-black border-white/20" />
                    <label htmlFor="terms" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                      Concordo com o <strong className="text-white">Contrato do utilizador</strong> e confirmo que tenho pelo menos 18 anos.
                    </label>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Checkbox id="marketing" checked={agreeMarketing} onCheckedChange={(c) => setAgreeMarketing(c as boolean)}
                      className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:text-black border-white/20" />
                    <label htmlFor="marketing" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                      Concordo em receber promoções de marketing da MOZBET.
                    </label>
                  </div>
                </div>
              )}

              <Button type="submit"
                className="w-full h-12 text-base font-bold bg-[#a3ff12] text-black hover:bg-[#8ee600] mt-2 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                disabled={loading || !isFormValid}
              >
                {loading ? "A processar..." : isLogin ? "Iniciar Sessão" : "Registar"}
              </Button>
            </form>

            {/* Link entre Login/Registo */}
            <div className="mt-4 text-center text-sm border-t border-white/5 pt-4">
              <span className="text-muted-foreground">
                {isLogin ? "Ainda não tens conta?" : "Já tens uma conta?"}{" "}
              </span>
              <button type="button" onClick={() => { setIsLogin(!isLogin); resetForm(); }}
                className="text-white hover:text-primary transition-colors font-bold ml-1" disabled={loading}>
                {isLogin ? "Criar conta" : "Entrar"}
              </button>
            </div>

            {/* Esqueci a senha (só no Login) */}
            {isLogin && (
              <div className="text-center mt-2">
                <button type="button" onClick={() => setStep("forgot")}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors underline">
                  Esqueci-me da palavra-passe
                </button>
              </div>
            )}
          </>
        )}

        {/* ════════ STEP: VERIFICAÇÃO OTP (REGISTO) ════════ */}
        {step === "otp" && (
          <>
            <DialogHeader className="mb-2">
              <button onClick={() => setStep("form")} className="text-muted-foreground hover:text-white mb-2 flex items-center gap-1 text-sm">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
              <DialogTitle className="text-xl font-bold text-white text-left">Verificar Número</DialogTitle>
            </DialogHeader>

            <p className="text-sm text-muted-foreground">
              Enviámos um código de 6 dígitos para <strong className="text-white">+258 {phone}</strong>. Introduza-o abaixo:
            </p>

            <OtpInputs />

            <Button onClick={() => handleVerifyOtp("register")}
              className="w-full h-12 text-base font-bold bg-[#a3ff12] text-black hover:bg-[#8ee600] disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={loading || otpValues.join("").length < 6}>
              {loading ? "A verificar..." : "Confirmar Código"}
            </Button>

            <div className="text-center mt-4 text-sm text-muted-foreground">
              {otpCountdown > 0 ? (
                <span>Reenviar em <strong className="text-white">{otpCountdown}s</strong></span>
              ) : (
                <button onClick={() => handleResendOtp("register")} className="text-primary hover:underline font-bold">
                  Reenviar código
                </button>
              )}
            </div>
          </>
        )}

        {/* ════════ STEP: ESQUECI A SENHA ════════ */}
        {step === "forgot" && (
          <>
            <DialogHeader className="mb-2">
              <button onClick={() => { setStep("form"); setIsLogin(true); }} className="text-muted-foreground hover:text-white mb-2 flex items-center gap-1 text-sm">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
              <DialogTitle className="text-xl font-bold text-white text-left">Recuperar Palavra-passe</DialogTitle>
            </DialogHeader>

            <p className="text-sm text-muted-foreground mb-4">
              Introduza o seu número de telemóvel e enviaremos um código de verificação por SMS.
            </p>

            <div className="space-y-1.5 mb-4">
              <Label className="text-muted-foreground text-xs">Telefone:</Label>
              <div className="relative flex items-center bg-black/40 border border-white/10 rounded-lg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                <div className="flex items-center pl-3 pr-2 border-r border-white/10">
                  <span className="text-lg mr-1" role="img">🇲🇿</span>
                  <span className="text-white font-bold text-sm">+258</span>
                </div>
                <Input type="tel" placeholder="000000000"
                  className="border-none bg-transparent h-12 font-mono-data text-white focus-visible:ring-0 px-3 shadow-none"
                  value={phone} onChange={handlePhoneChange} disabled={loading}
                />
              </div>
            </div>

            <Button onClick={handleForgotSend}
              className="w-full h-12 text-base font-bold bg-[#a3ff12] text-black hover:bg-[#8ee600] disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={loading || phone.length < 8}>
              {loading ? "A enviar..." : "Enviar Código SMS"}
            </Button>
          </>
        )}

        {/* ════════ STEP: OTP PARA RESET ════════ */}
        {step === "forgot-otp" && (
          <>
            <DialogHeader className="mb-2">
              <button onClick={() => setStep("forgot")} className="text-muted-foreground hover:text-white mb-2 flex items-center gap-1 text-sm">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
              <DialogTitle className="text-xl font-bold text-white text-left">Código de Verificação</DialogTitle>
            </DialogHeader>

            <p className="text-sm text-muted-foreground">
              Introduza o código enviado para <strong className="text-white">+258 {phone}</strong>:
            </p>

            <OtpInputs />

            <Button onClick={() => handleVerifyOtp("reset")}
              className="w-full h-12 text-base font-bold bg-[#a3ff12] text-black hover:bg-[#8ee600] disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={loading || otpValues.join("").length < 6}>
              {loading ? "A verificar..." : "Verificar Código"}
            </Button>

            <div className="text-center mt-4 text-sm text-muted-foreground">
              {otpCountdown > 0 ? (
                <span>Reenviar em <strong className="text-white">{otpCountdown}s</strong></span>
              ) : (
                <button onClick={() => handleResendOtp("reset")} className="text-primary hover:underline font-bold">
                  Reenviar código
                </button>
              )}
            </div>
          </>
        )}

        {/* ════════ STEP: NOVA SENHA ════════ */}
        {step === "new-password" && (
          <>
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold text-white text-left">Nova Palavra-passe</DialogTitle>
            </DialogHeader>

            <p className="text-sm text-muted-foreground mb-4">
              Defina a sua nova palavra-passe para a conta <strong className="text-white">+258 {phone}</strong>.
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Nova palavra-passe:</Label>
                <div className="relative flex items-center bg-black/40 border border-white/10 rounded-lg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                  <div className="pl-3 text-muted-foreground"><KeyRound className="w-5 h-5" /></div>
                  <Input type="password"
                    className="border-none bg-transparent h-12 font-mono-data text-white focus-visible:ring-0 px-3 shadow-none"
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Confirmar nova palavra-passe:</Label>
                <div className="relative flex items-center bg-black/40 border border-white/10 rounded-lg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                  <div className="pl-3 text-muted-foreground"><KeyRound className="w-5 h-5" /></div>
                  <Input type="password"
                    className="border-none bg-transparent h-12 font-mono-data text-white focus-visible:ring-0 px-3 shadow-none"
                    value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} disabled={loading}
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleResetPassword}
              className="w-full h-12 text-base font-bold bg-[#a3ff12] text-black hover:bg-[#8ee600] mt-4 disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={loading || newPassword.length < 4 || newPassword !== confirmNewPassword}>
              {loading ? "A redefinir..." : "Redefinir Palavra-passe"}
            </Button>
          </>
        )}

      </DialogContent>
    </Dialog>
  );
}
