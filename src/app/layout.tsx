import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import { LayoutWrapper } from "@/components/LayoutWrapper";

export const metadata: Metadata = {
  metadataBase: new URL("https://mozbet.online"),
  title: {
    default: "MOZBET — A Melhor Casa de Apostas Online em Moçambique 🇲🇿",
    template: "%s | MOZBET"
  },
  description:
    "Aposta na MOZBET, a plataforma #1 de Moçambique. Aviator, Mines, Crash Games e Casino ao vivo. Depósitos instantâneos via M-Pesa e E-Mola. Regista-te e ganha bónus!",
  authors: [{ name: "MOZBET" }],
  keywords: [
    "mozbet",
    "moz bet",
    "mozbet aviator",
    "aviator moz bet",
    "mines moz",
    "mines moz bet",
    "mozbet moçambique",
    "apostas online moçambique",
    "casino online mpesa",
    "jogar aviator moçambique",
    "moçambique apostas desportivas",
    "ganhar dinheiro online moçambique",
    "emola apostas",
    "jogos de crash moçambique",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    title: "MOZBET — Casa de Apostas e Casino Online",
    description: "A melhor plataforma de apostas de Moçambique. Joga Aviator, Mines e ganha bónus exclusivos.",
    siteName: "MOZBET",
    locale: "pt_MZ",
    url: "https://mozbet.online",
  },
  twitter: {
    card: "summary_large_image",
    title: "MOZBET — Casa de Apostas Online",
    description: "A melhor plataforma de apostas de Moçambique. Joga e ganha com M-Pesa.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: "C98B2UI1pB5Ki8PKaMf8z3euE9wpZtNc4mlfl9kFnrc",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import Script from 'next/script';

import { headers } from "next/headers";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const isAffiliateSubdomain = headersList.get("x-is-affiliate-subdomain") === "true";
  const isAffiliateRoute = headersList.get("x-is-affiliate-route") === "true";
  const isAffiliate = isAffiliateSubdomain || isAffiliateRoute;

  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
        
        {/* Google Analytics (Ponto de SEO) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-64DZY3WQEB"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-64DZY3WQEB');
          `}
        </Script>
      </head>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased" suppressHydrationWarning>
        <AuthProvider>
          <LayoutWrapper isAffiliate={isAffiliate}>
            {children}
          </LayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
