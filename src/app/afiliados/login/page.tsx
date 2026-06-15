"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Lock, Mail, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";

export default function AffiliateLogin() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#1c1a24] flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#a3ff12]/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#a3ff12]/3 rounded-full blur-3xl -z-10" />

      <div className="w-full max-w-md bg-[#1c1a24]/60 border border-white/5 p-8 rounded-2xl shadow-2xl space-y-6 backdrop-blur-md">
        
        {/* LOGO */}
        <div className="text-center space-y-2">
          <span className="text-3xl font-black text-white tracking-wider">
            MOZ<span className="text-[#a3ff12] drop-shadow-[0_0_8px_rgba(163,255,18,0.4)]">BET</span>
          </span>
          <p className="text-sm text-[#a3ff12] font-bold tracking-widest uppercase">
            Partners Program
          </p>
          <h2 className="text-xl font-bold text-slate-100 pt-2">
            Entra no teu Painel de Parceiro
          </h2>
        </div>

        {/* FORM */}
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
                className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#a3ff12] focus:ring-1 focus:ring-[#a3ff12] transition-all duration-200 text-sm"
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
                className="w-full pl-11 pr-12 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#a3ff12] focus:ring-1 focus:ring-[#a3ff12] transition-all duration-200 text-sm"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#a3ff12] text-black rounded-xl font-extrabold hover:bg-[#8ee600] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-lg shadow-[#a3ff12]/10 cursor-pointer pt-2"
          >
            {loading ? "A processar..." : "ENTRAR NO PAINEL"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        {/* REDIRECT TO REGISTER */}
        <div className="text-center text-xs text-slate-500 pt-2 border-t border-white/5">
          <span>Ainda não é parceiro? </span>
          <Link href="/registar" className="text-[#a3ff12] hover:text-[#8ee600] font-bold underline transition-colors">
            Crie a sua conta de afiliado
          </Link>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-600">
          <ShieldCheck className="h-4 w-4 text-[#a3ff12]/50" />
          <span>Conexão de segurança encriptada (128-bit SSL)</span>
        </div>
      </div>
    </div>
  );
}
