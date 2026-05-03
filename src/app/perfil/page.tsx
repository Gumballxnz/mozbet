"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { 
  User as UserIcon, Mail, Phone, Camera, Save, LogOut, 
  Gift, KeyRound, Calendar, Hash, CheckSquare, Square, 
  ChevronLeft, Wallet, ArrowUpCircle, Pencil, ShieldCheck,
  TrendingUp, Lock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const AVATARS = [
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=f59e0b",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&backgroundColor=10b981",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Jack&backgroundColor=3b82f6",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Molly&backgroundColor=8b5cf6",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&backgroundColor=ef4444",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe&backgroundColor=ec4899",
];

export default function PerfilPage() {
  const { user, logout, setDepositOpen } = useAppStore();
  const balance = user?.balance || 0;
  const router = useRouter();
  
  const fallbackAvatar = user?.id 
    ? AVATARS[(user.id.charCodeAt(0) + user.id.charCodeAt(user.id.length - 1)) % AVATARS.length] 
    : AVATARS[0];
    
  const [email, setEmail] = useState(user?.email || "");
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || fallbackAvatar);
  const [isSaving, setIsSaving] = useState(false);
  const [commercialOptIn, setCommercialOptIn] = useState(true);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  
  const [isEmailEditing, setIsEmailEditing] = useState(!user?.email);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordMethod, setPasswordMethod] = useState<"sms" | "email">("email");
  const [passwordOtp, setPasswordOtp] = useState("");
  const [passwordStep, setPasswordStep] = useState<"choose" | "verify" | "done">("choose");

  if (!user) {
    if (typeof window !== "undefined") router.push("/");
    return null;
  }

  const shortId = user.id ? user.id.split("-")[0].toUpperCase() : "552223";
  const registerDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-MZ") : "29/04/2026";
  
  // DADOS REAIS DO BANCO DE DADOS
  const bonusBalance = user.bonusBalance || 0.00; 
  const toUnlock = user.unlockedBalance || 0.00;
  const vipLevel = user.vipLevel || 1;

  const handleSimulatedWithdraw = () => {
    toast.info("Processando levantamento...", {
      description: "Esta funcionalidade está em modo de simulação. O seu pedido foi registado com sucesso!",
      duration: 5000,
    });
  };

  const handleSave = async () => {
    // 1. Se o email mudou, precisamos de enviar e validar um OTP
    const isNewEmail = email && email.includes("@") && email !== (user?.email || "");
    
    if (isNewEmail && !showOtpInput) {
      setIsSaving(true);
      try {
        const res = await fetch("/api/profile/send-email-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao pedir código.");
        
        toast.success("Código enviado para o novo e-mail!");
        setShowOtpInput(true);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // 2. Se já estamos a mostrar o OTP, validamos tudo
    if (showOtpInput && !emailOtp) {
      toast.error("Introduz o código de verificação.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          avatar: selectedAvatar, 
          email: isNewEmail ? email : undefined,
          otp: showOtpInput ? emailOtp : undefined 
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao salvar");
      
      toast.success("Perfil atualizado com sucesso!");
      setShowAvatarPicker(false);
      setShowOtpInput(false);
      setIsEmailEditing(false);
      setTimeout(() => window.location.reload(), 800);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm("Deseja realmente sair?")) return;
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      logout();
      router.push("/");
    } catch {
      toast.error("Erro ao sair");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 py-6 pb-24 space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER: BOTÃO VOLTAR E TÍTULO */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push("/")}
          className="bg-white/5 hover:bg-white/10 rounded-full w-10 h-10 border border-white/5 shrink-0"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </Button>
        <h1 className="text-xl font-black text-white uppercase tracking-tight">Perfil</h1>
      </div>

      {/* HEADER: AVATAR & VIP */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          {/* Anel de Brilho */}
          <div className="w-24 h-24 rounded-full p-0.5 bg-gradient-to-tr from-primary via-emerald-400 to-primary shadow-[0_0_20px_rgba(0,255,127,0.3)]">
            <div className="w-full h-full rounded-full bg-[#0f1015] p-1">
              <img 
                src={selectedAvatar} 
                alt="Profile" 
                className="w-full h-full rounded-full object-cover bg-surface"
              />
            </div>
          </div>
          
          {/* Botão Editar Avatar (Lápis) */}
          <button 
            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
            className="absolute -bottom-1 -right-1 bg-primary text-black p-1.5 rounded-full border-2 border-[#0f1015] hover:scale-110 transition-transform shadow-lg z-10"
          >
            <Pencil size={12} className="font-bold" />
          </button>

          {/* Badge VIP (Tamanho Ajustado) */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-black text-[9px] font-black px-2.5 py-0.5 rounded-full border-2 border-[#0f1015] flex items-center gap-1 shadow-lg z-20">
            VIP {vipLevel}
          </div>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-white tracking-tight">{user.phone}</h2>
          <div className="bg-white/5 px-3 py-0.5 rounded-full inline-block">
             <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-80">ID: {shortId}</p>
          </div>
        </div>
      </div>

      {/* SELECÇÃO DE AVATAR (Expandível) */}
      {showAvatarPicker && (
        <div className="bg-surface border border-white/5 p-4 rounded-2xl animate-in slide-in-from-top-2 duration-300">
          <p className="text-xs font-bold text-muted-foreground uppercase mb-4 text-center">Escolher Novo Avatar</p>
          <div className="flex flex-wrap justify-center gap-3">
            {AVATARS.map((av, i) => (
              <button 
                key={i}
                onClick={() => setSelectedAvatar(av)}
                className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${selectedAvatar === av ? 'border-primary scale-110' : 'border-transparent opacity-40 hover:opacity-100'}`}
              >
                <img src={av} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" className="flex-1 text-xs" onClick={() => setShowAvatarPicker(false)}>Cancelar</Button>
            <Button className="flex-1 bg-primary text-black font-bold text-xs" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "A guardar..." : "Confirmar"}
            </Button>
          </div>
        </div>
      )}

      {/* BOTÕES DE ACÇÃO PRINCIPAIS */}
      <div className="space-y-3">
        <Button 
          onClick={() => setDepositOpen(true)}
          className="w-full h-14 bg-primary text-black hover:bg-primary/90 font-black text-lg rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-primary/10 transition-all hover:scale-[1.01] active:scale-[0.98]"
        >
          <Wallet size={24} />
          DEPOSITAR
        </Button>
        
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline"
            onClick={handleSimulatedWithdraw}
            className="h-12 bg-surface border-white/5 text-white font-bold rounded-xl hover:bg-white/5 flex items-center gap-2"
          >
            <ArrowUpCircle size={18} className="text-primary" />
            LEVANTAMENTO
          </Button>
          <Button 
            onClick={handleLogout}
            className="h-12 bg-red-500/10 border border-red-500/20 text-red-500 font-bold rounded-xl hover:bg-red-500/20 flex items-center gap-2"
          >
            <LogOut size={18} />
            SAIR
          </Button>
        </div>
      </div>

      {/* CARDS DE SALDO E INFO (Grelha) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface/50 border border-white/5 p-4 rounded-2xl space-y-1">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Bónus</p>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-white">{bonusBalance.toFixed(2)}</span>
            <span className="text-[10px] font-bold text-muted-foreground">MZN</span>
          </div>
        </div>

        <div className="bg-surface/50 border border-white/5 p-4 rounded-2xl space-y-1">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">Saldo Real</p>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-white">{balance.toFixed(2)}</span>
            <span className="text-[10px] font-bold text-muted-foreground">MZN</span>
          </div>
        </div>

        <div className="bg-surface/50 border border-white/5 p-4 rounded-2xl space-y-1">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">A Desbloquear</p>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-white">{toUnlock.toFixed(2)}</span>
            <span className="text-[10px] font-bold text-muted-foreground">MZN</span>
          </div>
        </div>

        <div className="bg-surface/50 border border-white/5 p-4 rounded-2xl space-y-1">
          <div className="flex items-center gap-1">
            <Calendar size={10} className="text-primary" />
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Registo</p>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-black text-white">{registerDate}</span>
          </div>
        </div>
      </div>

      {/* DEFINIÇÕES ADICIONAIS */}
      <div className="bg-surface border border-white/5 p-5 rounded-3xl space-y-6">
        <div className="space-y-2">
          <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Mail size={14} className="text-primary" />
            E-mail Registado
          </label>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Input 
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (showOtpInput) setShowOtpInput(false); // Reset se mudar o email após erro
                }}
                disabled={!isEmailEditing || showOtpInput}
                placeholder="seu.email@exemplo.com"
                className="bg-black/40 border-white/10 text-white font-medium h-12 rounded-xl disabled:opacity-80"
              />
              {!isEmailEditing ? (
                <Button 
                  variant="outline" 
                  className="h-12 border-white/10 hover:bg-white/5 text-xs font-bold" 
                  onClick={() => setIsEmailEditing(true)}
                >
                  ALTERAR
                </Button>
              ) : (
                <Button 
                  className="h-12 bg-primary text-black font-bold text-xs" 
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? "..." : (showOtpInput ? "CONFIRMAR" : "GUARDAR")}
                </Button>
              )}
            </div>

            {/* CAMPO DE CÓDIGO OTP (Visível após GUARDAR) */}
            {showOtpInput && (
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl space-y-3 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest">
                  <ShieldCheck size={14} />
                  Verificação de Segurança
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Enviámos um código para <strong className="text-white">{email}</strong>. Introduz o código abaixo para validar o novo endereço.
                </p>
                <div className="flex gap-2">
                  <Input 
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="bg-black/60 border-primary/30 text-white font-black text-center text-lg tracking-[0.5em] h-12 rounded-xl"
                  />
                  <Button 
                    variant="ghost" 
                    className="text-[10px] font-bold text-muted-foreground hover:text-white"
                    onClick={() => { setShowOtpInput(false); setEmailOtp(""); }}
                  >
                    CANCELAR
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <Button 
          variant="ghost" 
          onClick={() => setShowPasswordModal(true)}
          className="w-full h-12 justify-between bg-black/20 border border-white/5 text-white hover:bg-white/5 rounded-xl px-4"
        >
          <div className="flex items-center gap-3">
            <KeyRound size={18} className="text-muted-foreground" />
            <span className="text-sm font-bold">Alterar Palavra-Passe</span>
          </div>
          <ChevronLeft size={18} className="rotate-180 text-muted-foreground" />
        </Button>
      </div>

      {/* CHECKBOX MARKETING (Apenas visível se o utilizador não tiver email ou estiver a editar um vazio) */}
      {(!user.email || isEmailEditing) && (
        <div 
           className="flex items-start gap-3 p-2 cursor-pointer group"
           onClick={() => setCommercialOptIn(!commercialOptIn)}
        >
           <div className="mt-0.5 transition-colors">
             {commercialOptIn ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5 text-muted-foreground group-hover:text-white" />}
           </div>
           <p className="text-[11px] text-muted-foreground leading-relaxed">
             Estou disposto a receber emails com ofertas comerciais, bónus exclusivos e novidades da plataforma MozBet.
           </p>
        </div>
      )}

      {/* MODAL PALAVRA-PASSE (SIMPLIFICADO) */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#1a1b23] border border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-6 shadow-2xl">
            <div className="space-y-1">
              <h3 className="font-black text-xl text-white">Nova Senha</h3>
              <p className="text-xs text-muted-foreground">Escolha como deseja validar a alteração.</p>
            </div>
            
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full h-14 justify-start gap-4 border-white/5 bg-black/40 hover:bg-white/5 rounded-2xl"
                onClick={() => setPasswordMethod("email")}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${passwordMethod === "email" ? "bg-primary text-black" : "bg-white/5 text-gray-400"}`}>
                  <Mail size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white">Via E-mail</p>
                  <p className="text-[10px] text-muted-foreground">{user.email || "Não configurado"}</p>
                </div>
              </Button>

              <Button 
                variant="outline" 
                className="w-full h-14 justify-start gap-4 border-white/5 bg-black/40 hover:bg-white/5 rounded-2xl"
                onClick={() => setPasswordMethod("sms")}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${passwordMethod === "sms" ? "bg-primary text-black" : "bg-white/5 text-gray-400"}`}>
                  <Phone size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white">Via SMS</p>
                  <p className="text-[10px] text-muted-foreground">+258 {user.phone}</p>
                </div>
              </Button>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" className="flex-1 h-12 font-bold" onClick={() => setShowPasswordModal(false)}>CANCELAR</Button>
              <Button className="flex-1 h-12 bg-primary text-black font-black" onClick={() => toast.info("Código enviado!")}>ENVIAR</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

