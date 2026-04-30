"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { User, Mail, Phone, Camera, Save, LogOut, Gift, KeyRound, Calendar, Hash, CheckSquare, Square, ChevronLeft } from "lucide-react";
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
  const { user, logout } = useAppStore();
  const router = useRouter();
  
  const [email, setEmail] = useState(user?.email || "");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [commercialOptIn, setCommercialOptIn] = useState(true);
  
  // Estados para OTP
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedAvatar = localStorage.getItem("mozbet_avatar");
      if (savedAvatar) setSelectedAvatar(savedAvatar);
    }
  }, []);

  if (!user) {
    if (typeof window !== "undefined") router.push("/");
    return null;
  }

  const shortId = user.id ? user.id.split("-")[0].toUpperCase() : "MZ9982X";
  const registerDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-MZ") : new Date().toLocaleDateString("pt-MZ");
  const bonusBalance = 0; // Simulated bonus

  const handleSave = async () => {
    // 1. Se tem email e ainda não pediu OTP, pede o OTP primeiro
    if (email && email.includes("@") && !showOtpInput) {
      setIsSaving(true);
      try {
        const res = await fetch("/api/profile/send-email-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "Erro ao pedir código.");
        
        toast.success("Enviámos um código para o teu e-mail.");
        setShowOtpInput(true);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // 2. Se não tem email, ou já tem email e OTP, guarda o perfil
    if (showOtpInput && !emailOtp) {
      toast.error("Introduz o código de verificação enviado para o teu e-mail.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: emailOtp, commercialOptIn, avatar: selectedAvatar }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao atualizar");

      if (typeof window !== "undefined") {
         localStorage.setItem("mozbet_avatar", selectedAvatar);
      }
      toast.success("Perfil e preferências guardados com sucesso!");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      toast.error(err.message || "Ocorreu um erro ao guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = () => {
    toast.info("Por questões de segurança, enviámos um código para o seu telemóvel para alterar a senha.");
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      logout();
      router.push("/");
    } catch {
      toast.error("Erro ao sair da conta");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 py-8 space-y-6 animate-in fade-in">
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push("/")}
          className="bg-black/40 hover:bg-white/10 rounded-full w-10 h-10 border border-white/5"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Área do Jogador</h1>
          <p className="text-muted-foreground text-sm">Gerencie o seu perfil, segurança e preferências.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Info Box */}
        <div className="bg-surface border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
          <Hash className="w-5 h-5 text-primary mb-2" />
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">ID de Jogador</p>
          <p className="font-black text-white">{shortId}</p>
        </div>
        <div className="bg-surface border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
          <Calendar className="w-5 h-5 text-primary mb-2" />
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Membro Desde</p>
          <p className="font-black text-white">{registerDate}</p>
        </div>
      </div>

      <div className="bg-surface border border-white/5 p-6 rounded-2xl space-y-6">
        
        {/* BONUS E SALDOS */}
        <div className="flex items-center justify-between bg-black/40 border border-primary/20 rounded-xl p-4">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Gift className="w-5 h-5 text-primary" />
             </div>
             <div>
               <p className="text-xs text-muted-foreground font-bold">Saldo de Bónus</p>
               <p className="text-xl font-black text-primary">{bonusBalance.toFixed(2)} MT</p>
             </div>
           </div>
           <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-black">
             Usar
           </Button>
        </div>

        {/* AVATARES */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-white flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Escolher Avatar de Cassino
          </label>
          <div className="flex flex-wrap gap-4">
            {AVATARS.map((avatar, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedAvatar(avatar)}
                className={`relative w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${
                  selectedAvatar === avatar 
                    ? "border-primary scale-110 shadow-[0_0_15px_rgba(0,255,127,0.3)]" 
                    : "border-transparent opacity-50 hover:opacity-100"
                }`}
              >
                <img src={avatar} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <hr className="border-white/5" />

        {/* DADOS */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Número de Telemóvel
            </label>
            <Input 
              value={`+258 ${user.phone}`} 
              disabled 
              className="bg-black/50 border-white/10 text-muted-foreground opacity-70"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Adicionar Email
            </label>
            <div className="flex gap-2">
              <Input 
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setShowOtpInput(false);
                  setEmailOtp("");
                }}
                disabled={showOtpInput}
                className="bg-black/50 border-white/10 text-white flex-1"
              />
              {showOtpInput && (
                <Button 
                  variant="outline"
                  onClick={() => setShowOtpInput(false)}
                  className="bg-black/40 border-white/10 hover:bg-white/5"
                >
                  Alterar
                </Button>
              )}
            </div>
            
            {showOtpInput && (
              <div className="mt-4 p-4 border border-primary/20 bg-primary/5 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
                <label className="text-xs font-bold text-primary flex items-center gap-2">
                  Verifica a tua Caixa de Entrada
                </label>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Enviámos um código de 6 dígitos para <strong className="text-white">{email}</strong>. Introduz o código abaixo para confirmar e receber os bónus de boas-vindas.
                </p>
                <Input 
                  placeholder="000000"
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="bg-black/50 border-primary/30 text-white text-center tracking-[0.5em] font-bold text-lg"
                  maxLength={6}
                />
              </div>
            )}
            
            {/* Checkbox Comercial */}
            {!showOtpInput && (
            <div 
               className="flex items-start gap-2 mt-2 cursor-pointer"
               onClick={() => setCommercialOptIn(!commercialOptIn)}
            >
               <div className="mt-0.5 text-primary">
                 {commercialOptIn ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-muted-foreground" />}
               </div>
               <p className="text-[10px] text-muted-foreground leading-tight">
                 Estou disposto a receber emails com ofertas comerciais, bónus exclusivos e novidades da plataforma MozBet.
               </p>
            </div>
            )}
          </div>
          
          <div className="pt-2">
             <Button 
               variant="outline" 
               onClick={handleChangePassword}
               className="w-full justify-start bg-black/40 border-white/10 text-white hover:bg-white/5"
             >
               <KeyRound className="w-4 h-4 mr-2 text-muted-foreground" />
               Alterar Palavra-Passe
             </Button>
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full bg-primary text-black hover:bg-primary/90 font-bold h-12"
        >
          {isSaving ? "A Salvar..." : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar Preferências
            </>
          )}
        </Button>

      </div>

      <Button 
        variant="destructive" 
        onClick={handleLogout}
        className="w-full bg-red-500/10 text-red-500 hover:bg-red-500/20 h-12"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sair da Conta
      </Button>
    </div>
  );
}
