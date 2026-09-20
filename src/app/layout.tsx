import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import { LayoutWrapper } from "@/components/LayoutWrapper";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const appName = process.env.NEXT_PUBLIC_APP_NAME || "MozBet";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: `${appName} — Apostas Online e Casino`,
    template: `%s | ${appName}`
  },
  description:
    `${appName} — Plataforma de Apostas Online, Aviator, Mines, Crash Games e Casino ao vivo. Depósitos instantâneos e seguros.`,
  authors: [{ name: appName }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    title: `${appName} — Casa de Apostas e Casino Online`,
    description: `A melhor plataforma de apostas. Joga Aviator, Mines e ganha bónus exclusivos na ${appName}.`,
    siteName: appName,
    locale: "pt_MZ",
    url: appUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: `${appName} — Casa de Apostas Online`,
    description: "A melhor plataforma de apostas. Joga e ganha!",
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
  ...(process.env.GOOGLE_SITE_VERIFICATION ? {
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
    }
  } : {}),
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

  const isAdminSubdomain = headersList.get("x-is-admin-subdomain") === "true";

  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg?v=2" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.ico?v=2" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />

        {}
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
          <LayoutWrapper isAffiliate={isAffiliate} isAdmin={isAdminSubdomain}>
            {children}
          </LayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
