"use client";

import { usePathname } from "next/navigation";
import { MobileHeader } from "@/components/MobileHeader";
import { MobileNavigation } from "@/components/MobileNavigation";
import { RegisterModal } from "@/components/RegisterModal";
import { DepositModal } from "@/components/DepositModal";
import { SupportChat } from "@/components/SupportChat";
import { Footer } from "@/components/Footer";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MobileSidebar } from "@/components/MobileSidebar";
import { Toaster } from "sonner";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return (
      <>
        <main className="min-h-screen bg-background">
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
      <MobileSidebar />
      <Toaster theme="dark" position="top-center" richColors />
    </div>
  );
}
