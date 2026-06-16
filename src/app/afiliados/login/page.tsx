"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Lock, Mail, ArrowRight, ShieldCheck, Eye, EyeOff, KeyRound, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

// Etapas do fluxo de recuperação de senha
type ResetStep = "email" | "code" | "newPassword" | "success";

export default function AffiliateLogin() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estado do fluxo de recuperação de senha
  const [showReset, setShowReset] = useState(false);
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Referências para os inputs do código OTP
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Temporizador do cooldown para reenviar código
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // === LOGIN ===
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/affiliates/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao fazer login.");
      } else {
        toast.success("Login efetuado com sucesso!");
        router.refresh();
        router.push("/afiliados"); // Redireciona para o painel
      }
    } catch (err) {
      toast.error("Erro interno do servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // === RECUPERAÇÃO - Etapa 1: Enviar código por e-mail ===
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Informe o e-mail da tua conta de afiliado.");
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch("/api/affiliates/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao enviar código.");
      } else {
        toast.success("Código enviado! Verifica a tua caixa de e-mail.");
        setResetStep("code");
        setCooldown(60);
        // Foca no primeiro input do código
        setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
      }
    } catch (err) {
      toast.error("Erro interno do servidor.");
    } finally {
      setResetLoading(false);
    }
  };

  // === RECUPERAÇÃO - Etapa 2: Verificar código e definir nova senha ===
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = resetCode.join("");

    if (code.length !== 6) {
      toast.error("Digita o código completo de 6 dígitos.");
      return;
    }

    if (!newPassword || !confirmPassword) {
      toast.error("Preenche todos os campos de senha.");
      return;
    }

    if (newPassword.length < 4) {
      toast.error("A palavra-passe deve ter pelo menos 4 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As palavras-passe não coincidem.");
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch("/api/affiliates/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail,
          otp: code,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao redefinir senha.");
      } else {
        setResetStep("success");
      }
    } catch (err) {
      toast.error("Erro interno do servidor.");
    } finally {
      setResetLoading(false);
    }
  };

  // === Controle dos inputs de código OTP ===
  const handleCodeInput = (index: number, value: string) => {
    // Aceitar apenas dígitos
    const digit = value.replace(/\D/g, "").slice(-1);
    const newCode = [...resetCode];
    newCode[index] = digit;
    setResetCode(newCode);

    // Auto-avançar para o próximo input
    if (digit && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !resetCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedText.length > 0) {
      const newCode = [...resetCode];
      for (let i = 0; i < pastedText.length && i < 6; i++) {
        newCode[i] = pastedText[i];
      }
      setResetCode(newCode);
      // Foca no último input preenchido ou no próximo vazio
      const focusIndex = Math.min(pastedText.length, 5);
      codeInputRefs.current[focusIndex]?.focus();
    }
  };

  // === Reenviar código ===
  const handleResendCode = async () => {
    if (cooldown > 0) return;
    setResetLoading(true);
    try {
      const res = await fetch("/api/affiliates/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao reenviar código.");
      } else {
        toast.success("Novo código enviado para o teu e-mail!");
        setCooldown(60);
        setResetCode(["", "", "", "", "", ""]);
        codeInputRefs.current[0]?.focus();
      }
    } catch {
      toast.error("Erro ao reenviar código.");
    } finally {
      setResetLoading(false);
    }
  };

  // === Fechar modal e resetar estado ===
  const closeReset = () => {
    setShowReset(false);
    // Resetar após a animação de fechar
    setTimeout(() => {
      setResetStep("email");
      setResetEmail("");
      setResetCode(["", "", "", "", "", ""]);
      setNewPassword("");
      setConfirmPassword("");
      setCooldown(0);
    }, 300);
  };

  // Classes de input reutilizáveis
  const inputClass = "w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#00FF7F] focus:ring-1 focus:ring-[#00FF7F] transition-all duration-200 text-sm";
  const inputWithToggleClass = "w-full pl-11 pr-12 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#00FF7F] focus:ring-1 focus:ring-[#00FF7F] transition-all duration-200 text-sm";

  return (
    <div className="min-h-screen bg-[#0b0c0f] flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans">
      {/* Efeitos de fundo */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00FF7F]/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00FF7F]/3 rounded-full blur-3xl -z-10" />
 
      <div className="w-full max-w-md bg-[#12141c]/60 border border-white/5 p-8 rounded-2xl shadow-2xl space-y-6 backdrop-blur-md">
        
        {/* LOGO */}
        <div className="text-center space-y-2">
          <span className="text-3xl font-black text-white tracking-wider">
            MOZ<span className="text-[#00FF7F] drop-shadow-[0_0_8px_rgba(0,255,127,0.4)]">BET</span>
          </span>
          <p className="text-sm text-[#00FF7F] font-bold tracking-widest uppercase">
            Partners Program
          </p>
          <h2 className="text-xl font-bold text-slate-100 pt-2">
            Entra no teu Painel de Parceiro
          </h2>
        </div>
 
        {/* FORMULÁRIO DE LOGIN */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1 text-left">
            <label className="text-xs font-semibold text-muted-foreground">E-mail, Usuário ou Telefone *</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-white/40" />
              <input
                type="text"
                placeholder="E-mail, utilizador ou número"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>
 
          <div className="space-y-1 text-left">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-muted-foreground">Palavra-passe *</label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-white/40" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputWithToggleClass}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Link Esqueci a Senha */}
          <div className="text-right">
            <button
              type="button"
              onClick={() => setShowReset(true)}
              className="text-xs text-[#00FF7F]/70 hover:text-[#00FF7F] transition-colors cursor-pointer font-medium"
            >
              Esqueci a minha palavra-passe
            </button>
          </div>
 
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#00FF7F] text-black rounded-xl font-extrabold hover:bg-[#00d66a] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-lg shadow-[#00FF7F]/10 cursor-pointer pt-2"
          >
            {loading ? "A processar..." : "ENTRAR NO PAINEL"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>
 
        {/* REDIRECIONAR PARA REGISTO */}
        <div className="text-center text-xs text-slate-500 pt-2 border-t border-white/5">
          <span>Ainda não é parceiro? </span>
          <Link href="/registar" className="text-[#00FF7F] hover:text-[#00d66a] font-bold underline transition-colors">
            Crie a sua conta de afiliado
          </Link>
        </div>
 
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-600">
          <ShieldCheck className="h-4 w-4 text-[#00FF7F]/50" />
          <span>Conexão de segurança encriptada (128-bit SSL)</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL DE RECUPERAÇÃO DE SENHA */}
      {/* ============================================================ */}
      {showReset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeReset();
          }}
        >
          {/* Overlay escuro */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]" />

          {/* Card do modal */}
          <div className="relative w-full max-w-md bg-[#12141c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]">

            {/* Barra superior decorativa */}
            <div className="h-1 w-full bg-gradient-to-r from-[#00FF7F] via-[#00d66a] to-[#00FF7F]" />

            <div className="p-8">
              {/* ===== ETAPA 1: INSERIR E-MAIL ===== */}
              {resetStep === "email" && (
                <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-[#00FF7F]/10 flex items-center justify-center border border-[#00FF7F]/20">
                      <KeyRound className="h-8 w-8 text-[#00FF7F]" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Recuperar Palavra-passe</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Informa o e-mail associado à tua conta de afiliado. Enviaremos um código de verificação.
                    </p>
                  </div>

                  <form onSubmit={handleSendCode} className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-white/40" />
                      <input
                        type="email"
                        placeholder="O teu e-mail de afiliado"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className={inputClass}
                        required
                        autoFocus
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full py-3.5 bg-[#00FF7F] text-black rounded-xl font-extrabold hover:bg-[#00d66a] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-lg shadow-[#00FF7F]/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resetLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          A enviar...
                        </>
                      ) : (
                        <>
                          ENVIAR CÓDIGO
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={closeReset}
                    className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Voltar ao login
                  </button>
                </div>
              )}

              {/* ===== ETAPA 2: INSERIR CÓDIGO + NOVA SENHA ===== */}
              {resetStep === "code" && (
                <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-[#00FF7F]/10 flex items-center justify-center border border-[#00FF7F]/20">
                      <ShieldCheck className="h-8 w-8 text-[#00FF7F]" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Verificação & Nova Senha</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Digita o código de 6 dígitos enviado para{" "}
                      <span className="text-[#00FF7F] font-semibold">{resetEmail}</span>{" "}
                      e define a tua nova palavra-passe.
                    </p>
                  </div>

                  <form onSubmit={handleResetPassword} className="space-y-5">
                    {/* Inputs do código OTP */}
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-2">Código de verificação</label>
                      <div className="flex gap-2 justify-center" onPaste={handleCodePaste}>
                        {resetCode.map((digit, i) => (
                          <input
                            key={i}
                            ref={(el) => { codeInputRefs.current[i] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleCodeInput(i, e.target.value)}
                            onKeyDown={(e) => handleCodeKeyDown(i, e)}
                            className="w-12 h-14 text-center text-xl font-bold bg-black/40 border border-white/10 rounded-xl text-[#00FF7F] focus:outline-none focus:border-[#00FF7F] focus:ring-1 focus:ring-[#00FF7F] transition-all duration-200 caret-[#00FF7F]"
                          />
                        ))}
                      </div>
                      {/* Reenviar código */}
                      <div className="text-center mt-3">
                        {cooldown > 0 ? (
                          <span className="text-xs text-slate-500">
                            Reenviar código em <span className="text-[#00FF7F] font-bold">{cooldown}s</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendCode}
                            disabled={resetLoading}
                            className="text-xs text-[#00FF7F]/70 hover:text-[#00FF7F] transition-colors cursor-pointer font-medium"
                          >
                            Reenviar código
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Nova senha */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Nova palavra-passe *</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-white/40" />
                        <input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Mínimo 4 caracteres"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className={inputWithToggleClass}
                          required
                          minLength={4}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3.5 top-3.5 text-white/40 hover:text-white transition-colors cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirmar senha */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Confirmar palavra-passe *</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-white/40" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Repete a palavra-passe"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={inputWithToggleClass}
                          required
                          minLength={4}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-3.5 text-white/40 hover:text-white transition-colors cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      {/* Indicador de correspondência */}
                      {confirmPassword && (
                        <p className={`text-xs mt-1 ${newPassword === confirmPassword ? "text-[#00FF7F]" : "text-red-400"}`}>
                          {newPassword === confirmPassword ? "✓ As senhas coincidem" : "✗ As senhas não coincidem"}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={resetLoading || resetCode.join("").length !== 6}
                      className="w-full py-3.5 bg-[#00FF7F] text-black rounded-xl font-extrabold hover:bg-[#00d66a] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-lg shadow-[#00FF7F]/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resetLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          A processar...
                        </>
                      ) : (
                        <>
                          REDEFINIR PALAVRA-PASSE
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={() => setResetStep("email")}
                    className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Usar outro e-mail
                  </button>
                </div>
              )}

              {/* ===== ETAPA 3: SUCESSO ===== */}
              {resetStep === "success" && (
                <div className="space-y-6 animate-[fadeIn_0.3s_ease-out] text-center">
                  <div className="space-y-3">
                    <div className="w-20 h-20 mx-auto rounded-full bg-[#00FF7F]/10 flex items-center justify-center border-2 border-[#00FF7F]/30 animate-[pulse_2s_ease-in-out_infinite]">
                      <CheckCircle2 className="h-10 w-10 text-[#00FF7F]" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Senha Redefinida!</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      A tua palavra-passe foi atualizada com sucesso. Já podes iniciar sessão com a nova senha.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeReset}
                    className="w-full py-3.5 bg-[#00FF7F] text-black rounded-xl font-extrabold hover:bg-[#00d66a] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-lg shadow-[#00FF7F]/10 cursor-pointer"
                  >
                    VOLTAR AO LOGIN
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Estilos de animação inline */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
