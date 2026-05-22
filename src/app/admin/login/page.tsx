"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, KeyRound, Eye, EyeOff, QrCode, Copy } from "lucide-react";
import Image from "next/image";

type Step = "login" | "setup-totp" | "verify-totp";

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // TOTP Setup
  const [qrCode, setQrCode] = useState("");
  const [totpSecret, setTotpSecret] = useState("");

  // TOTP Verify
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 1: Login normal do admin
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error("Erro", { description: data.error || "Credenciais inválidas." });
        return;
      }

      // Verificar se é admin
      if (!data.user?.isAdmin && !data.isAdmin) {
        toast.error("Acesso negado", { description: "Esta conta não tem permissões de administrador." });
        return;
      }

      // Verificar se TOTP já está configurado
      const totpRes = await fetch("/api/admin/setup-totp", { method: "POST" });
      const totpData = await totpRes.json();

      if (totpData.alreadyEnabled) {
        // TOTP já configurado — pedir código
        setStep("verify-totp");
      } else {
        // Primeira vez — mostrar QR Code para configurar
        setQrCode(totpData.qrCode);
        setTotpSecret(totpData.secret);
        setStep("setup-totp");
      }
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verificar código TOTP
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newValues = [...otpValues];
    newValues[index] = value.slice(-1);
    setOtpValues(newValues);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyTotp = async () => {
    const code = otpValues.join("");
    if (code.length < 6) {
      toast.error("Introduza o código completo.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/verify-totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error("Erro", { description: data.error || "Código inválido." });
        setOtpValues(["", "", "", "", "", ""]);
        return;
      }

      toast.success(data.firstTime ? "2FA Ativado!" : "Bem-vindo, Admin!");
      router.push("/admin");
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 9) setPhone(value);
  };

  const copySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    toast.success("Segredo copiado!");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Painel Administrativo</h1>
          <p className="text-muted-foreground text-sm mt-1">MOZBET — Acesso Restrito</p>
        </div>

        <div className="bg-surface border border-white/5 rounded-2xl p-6">

          {/* ═══ STEP: LOGIN ═══ */}
          {step === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Telefone Admin:</Label>
                <div className="relative flex items-center bg-black/40 border border-white/10 rounded-lg focus-within:border-primary transition-all">
                  <div className="flex items-center pl-3 pr-2 border-r border-white/10">
                    <span className="text-lg mr-1" role="img">🇲🇿</span>
                    <span className="text-white font-bold text-sm">+258</span>
                  </div>
                  <Input type="tel" placeholder="8XXXXXXXX"
                    className="border-none bg-transparent h-12 font-mono-data text-white focus-visible:ring-0 px-3 shadow-none"
                    value={phone} onChange={handlePhoneChange} disabled={loading} required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Palavra-passe:</Label>
                <div className="relative flex items-center bg-black/40 border border-white/10 rounded-lg focus-within:border-primary transition-all">
                  <div className="pl-3 text-muted-foreground"><KeyRound className="w-5 h-5" /></div>
                  <Input type={showPassword ? "text" : "password"}
                    className="border-none bg-transparent h-12 font-mono-data text-white focus-visible:ring-0 px-3 shadow-none"
                    value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="pr-3 text-muted-foreground hover:text-white" tabIndex={-1}>
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button type="submit"
                className="w-full h-12 font-bold bg-primary text-black hover:bg-primary/90 disabled:opacity-30"
                disabled={loading || phone.length < 8 || password.length < 4}>
                {loading ? "A verificar..." : "Entrar"}
              </Button>
            </form>
          )}

          {/* ═══ STEP: CONFIGURAR TOTP (PRIMEIRA VEZ) ═══ */}
          {step === "setup-totp" && (
            <div className="space-y-5">
              <div className="text-center">
                <QrCode className="w-8 h-8 text-primary mx-auto mb-2" />
                <h2 className="text-lg font-bold text-white">Configurar Autenticação</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Escaneie este QR Code com o Google Authenticator ou cole o segredo manualmente.
                </p>
              </div>

              {/* QR Code */}
              {qrCode && (
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-xl">
                    <img src={qrCode} alt="QR Code TOTP" width={200} height={200} />
                  </div>
                </div>
              )}

              {/* Segredo Manual */}
              <div className="bg-black/40 border border-white/10 rounded-lg p-3 flex items-center justify-between">
                <code className="text-xs text-primary font-mono break-all">{totpSecret}</code>
                <button onClick={copySecret} className="ml-2 text-muted-foreground hover:text-white flex-shrink-0">
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Após escanear, introduza o código de 6 dígitos que aparece no aplicativo:
              </p>

              {/* Input dos 6 dígitos */}
              <div className="flex justify-center gap-2">
                {otpValues.map((val, idx) => (
                  <input key={idx}
                    ref={(el) => { otpRefs.current[idx] = el; }}
                    type="text" inputMode="numeric" maxLength={1} value={val}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-14 text-center text-2xl font-bold bg-black/40 border-2 border-white/10 rounded-lg text-white focus:border-primary outline-none transition-all"
                  />
                ))}
              </div>

              <Button onClick={handleVerifyTotp}
                className="w-full h-12 font-bold bg-primary text-black hover:bg-primary/90 disabled:opacity-30"
                disabled={loading || otpValues.join("").length < 6}>
                {loading ? "A ativar..." : "Ativar 2FA"}
              </Button>
            </div>
          )}

          {/* ═══ STEP: VERIFICAR TOTP (LOGIN SUBSEQUENTE) ═══ */}
          {step === "verify-totp" && (
            <div className="space-y-5">
              <div className="text-center">
                <Shield className="w-8 h-8 text-primary mx-auto mb-2" />
                <h2 className="text-lg font-bold text-white">Código de Verificação</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Introduza o código de 6 dígitos do Google Authenticator.
                </p>
              </div>

              <div className="flex justify-center gap-2">
                {otpValues.map((val, idx) => (
                  <input key={idx}
                    ref={(el) => { otpRefs.current[idx] = el; }}
                    type="text" inputMode="numeric" maxLength={1} value={val}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-14 text-center text-2xl font-bold bg-black/40 border-2 border-white/10 rounded-lg text-white focus:border-primary outline-none transition-all"
                  />
                ))}
              </div>

              <Button onClick={handleVerifyTotp}
                className="w-full h-12 font-bold bg-primary text-black hover:bg-primary/90 disabled:opacity-30"
                disabled={loading || otpValues.join("").length < 6}>
                {loading ? "A verificar..." : "Verificar e Entrar"}
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-4">
          Página exclusiva para administradores da MOZBET.
        </p>
      </div>
    </div>
  );
}
