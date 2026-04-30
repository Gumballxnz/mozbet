import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import { LayoutWrapper } from "@/components/LayoutWrapper";

export const metadata: Metadata = {
  title: "MOZBET — Casa de Apostas Online",
  description:
    "A melhor plataforma de apostas e jogos online de Moçambique. Crash games, slots, casino e muito mais. Deposite com M-Pesa e E-Mola.",
  authors: [{ name: "MOZBET" }],
  keywords: [
    "apostas online",
    "casa de apostas",
    "moçambique",
    "crash game",
    "aviator",
    "mines",
    "mpesa",
    "emola",
    "mozbet",
  ],
  openGraph: {
    type: "website",
    title: "MOZBET — Casa de Apostas Online",
    description:
      "A melhor plataforma de apostas e jogos online de Moçambique.",
    siteName: "MOZBET",
  },
  twitter: {
    card: "summary_large_image",
    title: "MOZBET — Casa de Apostas Online",
    description:
      "A melhor plataforma de apostas e jogos online de Moçambique.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased" suppressHydrationWarning>
        <AuthProvider>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
