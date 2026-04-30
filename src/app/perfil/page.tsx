"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { User, Mail, Phone, Camera, Save, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Lista de avatares pré-definidos
const AVATARS = [
  "/assets/avatar-1.png",
  "/assets/avatar-2.png",
  "/assets/avatar-3.png",
  "/assets/avatar-4.png",
  "/assets/avatar-5.png",
];

export default function PerfilPage() {
  const { user, logout } = useAppStore();
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [isSaving, setIsSaving] = useState(false);

  // Redireciona se não estiver logado
  if (!user) {
    if (typeof window !== "undefined") router.push("/");
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    // Simular chamada API para salvar avatar e email no Supabase
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Perfil atualizado com sucesso!");
    }, 1000);
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
    <div className="max-w-2xl mx-auto p-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">O Meu Perfil</h1>
        <p className="text-muted-foreground text-sm">Personalize a sua conta e defina um email de recuperação.</p>
      </div>

      <div className="bg-surface border border-white/5 p-6 rounded-2xl space-y-6">
        
        {/* AVATARES */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-white flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Escolher Avatar
          </label>
          <div className="flex flex-wrap gap-4">
            {AVATARS.map((avatar, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedAvatar(avatar)}
                className={`relative w-16 h-16 rounded-full overflow-hidden border-2 transition-all ${
                  selectedAvatar === avatar 
                    ? "border-primary scale-110 shadow-[0_0_15px_rgba(0,255,127,0.3)]" 
                    : "border-transparent opacity-50 hover:opacity-100"
                }`}
              >
                <div className="w-full h-full bg-white/10 flex items-center justify-center text-xl font-bold">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
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
              Número de Telemóvel (ID)
            </label>
            <Input 
              value={`+258 ${user.phone}`} 
              disabled 
              className="bg-black/50 border-white/10 text-muted-foreground opacity-70"
            />
            <p className="text-[10px] text-muted-foreground">O número de telefone não pode ser alterado por motivos de segurança.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email (Opcional)
            </label>
            <Input 
              placeholder="seu.email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-black/50 border-white/10 text-white"
            />
            <p className="text-[10px] text-muted-foreground">Adicione um email para receber notificações e ofertas exclusivas.</p>
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full bg-primary text-black hover:bg-primary/90 font-bold"
        >
          {isSaving ? "A Salvar..." : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar Alterações
            </>
          )}
        </Button>

      </div>

      <Button 
        variant="destructive" 
        onClick={handleLogout}
        className="w-full bg-red-500/10 text-red-500 hover:bg-red-500/20"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sair da Conta
      </Button>
    </div>
  );
}
