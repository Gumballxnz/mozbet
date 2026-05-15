"use client";

import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { User, Wallet, LogOut, MessageCircle, Bell, Zap, AlertTriangle, ExternalLink, X } from "lucide-react";
import { formatMZN } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { playSound } from "@/lib/sounds";

const AVATARS = [
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=f59e0b",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&backgroundColor=10b981",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Jack&backgroundColor=3b82f6",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Molly&backgroundColor=8b5cf6",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&backgroundColor=ef4444",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe&backgroundColor=ec4899",
];

export function MobileHeader() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isLoggedIn, user, openLogin, openRegister, setChatOpen, setDepositOpen } = useAppStore();

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [activeTab, setActiveTab] = useState<'promos' | 'notifs'>('notifs');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const handleGoToProfile = () => {
    setIsLoadingProfile(true);
    router.push('/perfil');
    setTimeout(() => setIsLoadingProfile(false), 2000);
  };

  const getRelativeTime = (dateString: string) => {
    const diffInMs = new Date().getTime() - new Date(dateString).getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    if (diffInDays === 0) return "HOJE";
    if (diffInDays === 1) return "HÁ 1 DIA";
    return `HÁ ${diffInDays} DIAS`;
  };

  // Carregar e ouvir notificações com Server Actions (Polling seguro e leve a cada 5s)
  useEffect(() => {
    if (!user) return;

    const fetchNotifs = async () => {
      try {
        const { getLatestNotifications } = await import("@/app/actions/notifications");
        const data = await getLatestNotifications(Date.now());
        
        // Obter ids globais lidos do localStorage
        const readGlobalIds = JSON.parse(localStorage.getItem('read_global_notifs') || '[]');
        
        setNotifications(data);
        
        // Verifica se há alguma notificação do user não lida OU alguma global não lida
        const hasUnreadPrivate = data.some((n: any) => !n.is_read && n.user_id === user.id);
        const hasUnreadGlobal = data.some((n: any) => n.user_id === null && !readGlobalIds.includes(n.id));
        
        // Tocar som se houver algo novo não lido
        if ((hasUnreadPrivate || hasUnreadGlobal) && !hasUnread) {
          playSound('notification');
        }
        
        setHasUnread(hasUnreadPrivate || hasUnreadGlobal);
      } catch (err) {
        // Silencioso
      }
    };
    
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const markAsRead = async () => {
    setHasUnread(false);
    if (!user) return;
    
    // Marcar as privadas na DB
    const unreadIds = notifications.filter(n => !n.is_read && n.user_id === user.id).map(n => n.id);
    
    // Marcar as globais no localStorage
    const globalIds = notifications.filter(n => n.user_id === null).map(n => n.id);
    if (globalIds.length > 0) {
      const readGlobalIds = JSON.parse(localStorage.getItem('read_global_notifs') || '[]');
      const newGlobalIds = Array.from(new Set([...readGlobalIds, ...globalIds]));
      localStorage.setItem('read_global_notifs', JSON.stringify(newGlobalIds));
    }
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    
    if (unreadIds.length > 0) {
      try {
        const { markNotificationsAsRead } = await import("@/app/actions/notifications");
        await markNotificationsAsRead(unreadIds);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const defaultAvatar = useMemo(() => {
    if (!user) return AVATARS[0];
    const charCode = user.id.charCodeAt(0) + user.id.charCodeAt(user.id.length - 1);
    return AVATARS[charCode % AVATARS.length];
  }, [user]);

  return (
    <>
      <header className="glass sticky top-0 z-40 w-full px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1 active:scale-95 transition-transform">
          <span className="text-xl font-extrabold tracking-tight text-white">
            MOZ<span className="text-primary glow-primary">BET</span>
          </span>
        </Link>

        {/* Ações */}
        <div className="flex items-center gap-2">

          {isLoggedIn && user ? (
            <>
              {/* Saldo e Depósito (Logado) */}
              <div className="flex items-center bg-surface-elevated border border-border rounded-full p-1 pr-3 shadow-inner">
                <Button
                  size="sm"
                  className="h-7 rounded-full text-xs px-3 shadow-[0_0_10px_rgba(0,255,127,0.2)]"
                  onClick={() => setDepositOpen(true)}
                >
                  <Wallet className="w-3 h-3 mr-1" />
                  {t("deposit")}
                </Button>
                <span className="ml-3 font-mono-data text-sm font-bold glow-primary text-primary">
                  {formatMZN(user.balance)}
                </span>
              </div>

              {/* Menu Usuário */}
              <div className="flex items-center gap-1.5 ml-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const willShow = !showNotifications;
                    setShowNotifications(willShow);
                    if (willShow) markAsRead();
                  }}
                  className="w-9 h-9 rounded-full bg-transparent hover:bg-white/5 relative"
                  title="Notificações"
                >
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  {hasUnread && (
                    <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse border border-background"></span>
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 rounded-full bg-surface p-0 overflow-hidden border-2 border-primary/50 shadow-[0_0_10px_rgba(0,255,127,0.2)] relative"
                  title="Perfil"
                  onClick={handleGoToProfile}
                  disabled={isLoadingProfile}
                >
                  <img src={user.avatar || defaultAvatar} alt="Avatar" className={`w-full h-full object-cover transition-opacity ${isLoadingProfile ? 'opacity-30' : 'opacity-100'}`} />
                  {isLoadingProfile && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 rounded-full bg-transparent hover:bg-white/5"
                  title="Chat Global"
                  onClick={() => setChatOpen(true)}
                >
                  <MessageCircle className="w-5 h-5 text-muted-foreground" />
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Botões (Deslogado) */}
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9"
                onClick={() => openLogin()}
              >
                {t("enter")}
              </Button>
              <Button
                size="sm"
                className="text-xs h-9 shadow-[0_0_15px_rgba(0,255,127,0.3)]"
                onClick={() => openRegister()}
              >
                {t("register")}
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Dropdown de Notificações */}
      {showNotifications && isLoggedIn && (
        <div className="fixed top-[60px] right-4 w-[350px] z-50 bg-[#101116] border border-[#2A2F40] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4">
          <div className="p-4 bg-[#0B0C10] relative">
            <button onClick={() => setShowNotifications(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-white"><X className="w-4 h-4" /></button>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-black text-xl text-primary tracking-wide uppercase">NOTIFICAÇÕES</h3>
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 ml-10">Fique por dentro das novidades</p>
          </div>
          
          <div className="flex border-b border-[#2A2F40]">
             <button 
               className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'promos' ? 'text-white border-b-2 border-primary' : 'text-gray-500 hover:text-gray-300'}`}
               onClick={() => setActiveTab('promos')}
             >
               <Zap className="w-4 h-4" /> PROMOÇÕES
             </button>
             <button 
               className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'notifs' ? 'text-white border-b-2 border-primary' : 'text-gray-500 hover:text-gray-300'}`}
               onClick={() => setActiveTab('notifs')}
             >
               <Bell className="w-4 h-4" /> NOTIFICAÇÕES
             </button>
          </div>

          <div className="max-h-[350px] overflow-y-auto bg-[#101116] p-3 space-y-3">
             {(() => {
               const promos = notifications.filter(n => n.type === 'promo');
               const notifs = notifications.filter(n => n.type !== 'promo');
               const itemsToRender = activeTab === 'promos' ? promos : notifs;

               if (itemsToRender.length === 0) {
                 return <div className="p-6 text-center text-muted-foreground text-xs font-bold">Sem novidades no momento.</div>;
               }

               return itemsToRender.map((notif) => {
                 const isFailed = notif.type === 'deposit_failed';
                 const isPromo = notif.type === 'promo';
                 
                 const titleMap: Record<string, string> = {
                   deposit_pending: "Depósito Iniciado",
                   deposit_failed: "Depósito Falhou",
                   deposit_success: "Depósito Concluído",
                   promo: "Bónus Exclusivo",
                   alert: "Aviso de Segurança",
                   SYSTEM: "Mensagem do Sistema"
                 };
                 const displayTitle = titleMap[notif.type] || notif.type || "Notificação";
                 
                 return (
                   <div key={notif.id} className={`border rounded-xl p-4 relative overflow-hidden ${isFailed ? 'bg-red-950/20 border-red-900/30' : 'bg-[#1A1D27] border-[#2A2F40]'}`}>
                     {!notif.is_read && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary" />}
                     
                     <div className="flex items-center gap-3 mb-3">
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                         isPromo ? 'bg-blue-600/20 border-blue-500/30' : 
                         isFailed ? 'border-red-500/30' : 
                         'border-gray-600/30'
                       }`}>
                          {isPromo ? <Zap className="w-5 h-5 text-blue-400" /> : 
                           isFailed ? <AlertTriangle className="w-5 h-5 text-red-500" /> : 
                           <Bell className="w-5 h-5 text-gray-400" />}
                       </div>
                       <div>
                         <h4 className="text-white font-black uppercase text-sm">{displayTitle}</h4>
                         <span className="text-[9px] text-gray-400 font-bold uppercase">{getRelativeTime(notif.created_at)}</span>
                       </div>
                     </div>
                     
                     <p className={`text-xs font-medium leading-relaxed ${isFailed ? 'text-gray-300' : 'text-gray-400'} ${isPromo || isFailed ? 'mb-4' : ''}`}>
                       {notif.message}
                     </p>
                     
                     {isPromo && (
                       <Button className="w-full bg-[#0B0C10] border border-[#2A2F40] hover:bg-white/5 text-white font-bold h-10" onClick={() => { setShowNotifications(false); setDepositOpen(true); }}>
                         DEPOSITAR <ExternalLink className="w-4 h-4 ml-2" />
                       </Button>
                     )}
                     
                     {isFailed && (
                       <Button className="w-full bg-[#0B0C10] border border-[#2A2F40] hover:bg-white/5 text-white font-bold h-10" onClick={() => { setShowNotifications(false); setDepositOpen(true); }}>
                         TENTAR NOVAMENTE <ExternalLink className="w-4 h-4 ml-2" />
                       </Button>
                     )}
                   </div>
                 );
               });
             })()}
          </div>
        </div>
      )}
    </>
  );
}
