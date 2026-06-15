"use client";
import { useEffect, Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MobileHeader } from "@/components/MobileHeader";
import { Footer } from "@/components/Footer";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { useAppStore } from "@/lib/store";
import { Toaster } from "sonner";
import dynamic from "next/dynamic";

// Lazy Loading: Estes componentes pesados só são descarregados quando necessários
// Reduz o bundle inicial em ~80KB+ de JavaScript (Performance Mobile Crítica)
const RegisterModal = dynamic(() => import("@/components/RegisterModal").then(m => m.RegisterModal), { ssr: false });
const DepositModal = dynamic(() => import("@/components/DepositModal").then(m => m.DepositModal), { ssr: false });
const SupportChat = dynamic(() => import("@/components/SupportChat").then(m => m.SupportChat), { ssr: false });
const ChatGlobal = dynamic(() => import("@/components/ChatGlobal"), { ssr: false });
const MobileSidebar = dynamic(() => import("@/components/MobileSidebar").then(m => m.MobileSidebar), { ssr: false });

export function LayoutWrapper({ children, isAffiliate: isAffiliateProp }: { children: React.ReactNode; isAffiliate?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { chatOpen, setChatOpen } = useAppStore();
  const isAdmin = pathname?.startsWith("/admin");
  const isEngine = pathname?.startsWith("/engine");
  const isAffiliate = isAffiliateProp || pathname?.startsWith("/afiliados");

  if (isAdmin || isEngine || isAffiliate) {
    return (
      <>
        <main className="min-h-screen bg-slate-950">
          {children}
        </main>
        <Toaster theme="dark" position="top-center" richColors />
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <div className="flex flex-1 relative">
        <Suspense fallback={<div className="hidden lg:flex w-64 bg-surface border-r border-white/5 h-screen sticky top-0" />}>
          <DesktopSidebar />
        </Suspense>
        <div className="flex-1 flex flex-col min-w-0">
          <MobileHeader />
          <main className="flex-1 pb-4 lg:pb-0">
            {children}
          </main>
          <Footer />
        </div>
        
        {/* Componentes Globais (Lazy Loaded) */}
        <RegisterModal />
        <DepositModal />
        <SupportChat />
        <ChatGlobal 
          isOpen={chatOpen} 
          onClose={() => setChatOpen(false)} 
          onPlayGame={(id) => { setChatOpen(false); router.push(`/jogar/${id}`); }}
        />
        <MobileSidebar />
        <Toaster theme="dark" position="top-center" richColors />
      </div>
    </div>
  );
}
