"use client";

import { usePathname, useRouter } from "next/navigation";
import { MobileHeader } from "@/components/MobileHeader";
import { MobileNavigation } from "@/components/MobileNavigation";
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

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { chatOpen, setChatOpen } = useAppStore();
  const isAdmin = pathname?.startsWith("/admin");
  const isEngine = pathname?.startsWith("/engine");

  if (isAdmin || isEngine) {
    return (
      <>
        <main className="min-h-screen bg-black">
          {children}
        </main>
        <Toaster theme="dark" position="top-center" richColors />
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DesktopSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 pb-24 lg:pb-0">
          {children}
        </main>
        <Footer />
        <MobileNavigation />
      </div>
      <RegisterModal />
      <DepositModal />
      <SupportChat />
      <ChatGlobal 
        isOpen={chatOpen} 
        onClose={() => setChatOpen(false)} 
        onPlayGame={(id) => { setChatOpen(false); router.push(`/jogar/${id}?mode=demo`); }}
      />
      <MobileSidebar />
      <Toaster theme="dark" position="top-center" richColors />
    </div>
  );
}
