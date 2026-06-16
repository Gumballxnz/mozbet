"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { User, Mail, Lock, Phone, CreditCard, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";

function AffiliateRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [saqueMethod, setSaqueMethod] = useState("mpesa");
  const [saqueNumber, setSaqueNumber] = useState("");
  const [saqueName, setSaqueName] = useState("");
  const [subCode, setSubCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Capturar código de subafiliado da URL (?sub=MB123456)
  useEffect(() => {
    const sub = searchParams.get("sub");
    if (sub) {
      setSubCode(sub);
      toast.info(`Indicado por afiliado código: ${sub}`);
    }
  }, [searchParams]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !username || !password || !confirmPassword || !phone || !saqueNumber || !saqueName) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (username.length < 3) {
      toast.error("O nome de usuário deve ter pelo menos 3 caracteres.");
      return;
    }

    if (password.length < 6) {
      toast.error("A palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As palavras-passe não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/affiliates/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          username,
          password,
          phone,
          playerId,
          saqueMethod,
          saqueNumber,
          saqueName,
          subCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao criar conta.");
      } else {
        toast.success("Conta de parceiro criada com sucesso!");
        router.refresh();
        router.push("/afiliados"); // Redireciona para o painel principal
      }
    } catch (err) {
      toast.error("Erro interno do servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4 text-left">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nome */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Nome Completo *</label>
          <div className="relative">
            <User className="absolute left-3.5 top-3.5 h-5 w-5 text-white/40" />
            <input
              type="text"
              placeholder="O seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#00FF7F] focus:ring-1 focus:ring-[#00FF7F] transition-all duration-200 text-sm"
              required
            />
          </div>
        </div>

        {/* Nome de Usuário */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Nome de Usuário (Username) *</label>
          <div className="relative">
            <User className="absolute left-3.5 top-3.5 h-5 w-5 text-white/40" />
            <input
              type="text"
              placeholder="ex: joaosilva"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#00FF7F] focus:ring-1 focus:ring-[#00FF7F] transition-all duration-200 text-sm"
              required
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* E-mail */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">E-mail *</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-white/40" />
            <input
              type="email"
              placeholder="exemplo@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#00FF7F] focus:ring-1 focus:ring-[#00FF7F] transition-all duration-200 text-sm"
              required
            />
          </div>
        </div>

        {/* Telefone de contato */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Número de Telefone *</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-3.5 h-5 w-5 text-white/40" />
            <input
              type="tel"
              placeholder="84XXXXXXX ou +258"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#00FF7F] focus:ring-1 focus:ring-[#00FF7F] transition-all duration-200 text-sm"
              required
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Senha */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Palavra-passe *</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-white/40" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-12 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#00FF7F] focus:ring-1 focus:ring-[#00FF7F] transition-all duration-200 text-sm"
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

        {/* Confirmar Palavra-passe */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Confirmar Palavra-passe *</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-white/40" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Repita a palavra-passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-11 pr-12 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#00FF7F] focus:ring-1 focus:ring-[#00FF7F] transition-all duration-200 text-sm"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3.5 top-3.5 text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ID de jogador Mozbet */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">ID de jogador da Mozbet (Opcional)</label>
          <div className="relative">
            <User className="absolute left-3.5 top-3.5 h-5 w-5 text-white/40" />
            <input
              type="text"
              placeholder="Seu ID ou Telefone de jogador"
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#00FF7F] focus:ring-1 focus:ring-[#00FF7F] transition-all duration-200 text-sm"
            />
          </div>
        </div>

        {/* Método de Saque */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Método de Saque para Comissão *</label>
          <div className="relative">
            <CreditCard className="absolute left-3.5 top-3.5 h-5 w-5 text-white/40" />
            <select
              value={saqueMethod}
              onChange={(e) => setSaqueMethod(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#00FF7F] focus:ring-1 focus:ring-[#00FF7F] transition-all duration-200 text-sm appearance-none cursor-pointer"
            >
              <option value="mpesa">Vodacom M-Pesa</option>
              <option value="emola">Movitel e-Mola</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nome do Titular da Conta Móvel */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Nome do Titular da Conta Móvel *</label>
          <div className="relative">
            <User className="absolute left-3.5 top-3.5 h-5 w-5 text-white/40" />
            <input
              type="text"
              placeholder="Nome conforme registo M-Pesa / e-Mola"
              value={saqueName}
              onChange={(e) => setSaqueName(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#00FF7F] focus:ring-1 focus:ring-[#00FF7F] transition-all duration-200 text-sm"
              required
            />
          </div>
        </div>

        {/* Número de Saque */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Número de Saque das Comissões *</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-3.5 h-5 w-5 text-white/40" />
            <input
              type="tel"
              placeholder="Número para levantamento M-Pesa / e-Mola"
              value={saqueNumber}
              onChange={(e) => setSaqueNumber(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#00FF7F] focus:ring-1 focus:ring-[#00FF7F] transition-all duration-200 text-sm"
              required
            />
          </div>
        </div>
      </div>

      {/* Código de subafiliado associado (Padrinho) */}
      {subCode && (
        <div className="bg-[#00FF7F]/10 border border-[#00FF7F]/20 p-3 rounded-xl text-xs text-[#00FF7F]">
          Você está se cadastrando através do convite de subafiliação do parceiro **{subCode}**.
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 bg-[#00FF7F] text-black rounded-xl font-extrabold hover:bg-[#00d66a] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-lg shadow-[#00FF7F]/10 cursor-pointer pt-2"
      >
        {loading ? "A processar..." : "CRIAR CONTA DE PARCEIRO"}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}

export default function AffiliateRegister() {
  return (
    <div className="min-h-screen bg-[#0b0c0f] flex flex-col justify-center items-center py-10 px-4 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00FF7F]/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00FF7F]/3 rounded-full blur-3xl -z-10" />

      <div className="w-full max-w-2xl bg-[#12141c]/60 border border-white/5 p-8 rounded-2xl shadow-2xl space-y-6 backdrop-blur-md">
        
        {/* LOGO */}
        <div className="text-center space-y-2">
          <span className="text-3xl font-black text-white tracking-wider">
            MOZ<span className="text-[#00FF7F] drop-shadow-[0_0_8px_rgba(0,255,127,0.4)]">BET</span>
          </span>
          <p className="text-sm text-[#00FF7F] font-bold tracking-widest uppercase">
            Partners Program
          </p>
          <h2 className="text-xl font-bold text-slate-100 pt-2">
            Registe-se e ganhe 70% de comissões!
          </h2>
          <p className="text-xs text-slate-500">
            Preencha o formulário abaixo para começar a faturar.
          </p>
        </div>

        {/* FORM WRAPPED IN SUSPENSE FOR SEARCHPARAMS */}
        <Suspense fallback={<div className="text-slate-400 text-center py-10">A carregar formulário...</div>}>
          <AffiliateRegisterForm />
        </Suspense>

        {/* REDIRECT TO LOGIN */}
        <div className="text-center text-xs text-slate-500 pt-2 border-t border-white/5">
          <span>Já tem conta de parceiro? </span>
          <Link href="/login" className="text-[#00FF7F] hover:text-[#00d66a] font-bold underline transition-colors">
            Faça login aqui
          </Link>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-600">
          <ShieldCheck className="h-4 w-4 text-[#00FF7F]/50" />
          <span>Segurança bancária garantida por encriptação ponta a ponta</span>
        </div>
      </div>
    </div>
  );
}
