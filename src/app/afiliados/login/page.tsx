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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl -z-10" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl space-y-6 backdrop-blur-md">
        
        {/* LOGO */}
        <div className="text-center space-y-2">
          <span className="text-3xl font-black text-white tracking-wider">
            MOZ<span className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">BET</span>
          </span>
          <p className="text-sm text-emerald-400 font-bold tracking-widest uppercase">
            Partners Program
          </p>
          <h2 className="text-xl font-bold text-slate-100 pt-2">
            Entra no teu Painel de Parceiro
          </h2>
        </div>

        {/* FORM */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1 text-left">
            <label className="text-xs font-semibold text-slate-400">E-mail, Usuário ou Telefone *</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-500" />
              <input
                type="text"
                placeholder="E-mail, utilizador ou número"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all duration-200 text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-1 text-left">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-400">Palavra-passe *</label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all duration-200 text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-500 text-slate-950 rounded-xl font-extrabold hover:bg-emerald-400 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-500/20 cursor-pointer pt-2"
          >
            {loading ? "A processar..." : "ENTRAR NO PAINEL"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        {/* REDIRECT TO REGISTER */}
        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-800/50">
          <span>Ainda não é parceiro? </span>
          <Link href="/registar" className="text-emerald-400 hover:text-emerald-300 font-bold underline transition-colors">
            Crie a sua conta de afiliado
          </Link>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-600">
          <ShieldCheck className="h-4 w-4 text-emerald-500/50" />
          <span>Conexão de segurança encriptada (128-bit SSL)</span>
        </div>
      </div>
    </div>
  );
}
