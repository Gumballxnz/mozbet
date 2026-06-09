import type { NextConfig } from "next";

// SEGURANÇA: IP do servidor VPS fixado diretamente para evitar problemas de variáveis de ambiente incorretas na Vercel
const VPS_URL = "http://155.248.224.133:3001";

const nextConfig: NextConfig = {
  // Otimizações de performance
  poweredByHeader: false, // Remove header "X-Powered-By" (segurança)
  compress: true, // Compressão gzip
  
  // Headers de segurança
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://static.cloudflareinsights.com https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' blob: data: https://api.dicebear.com https://objectstorage.ca-montreal-1.oraclecloud.com https://www.mozbet.online https://www.google-analytics.com https://www.googletagmanager.com",
              "connect-src 'self' wss://*.supabase.co https://*.supabase.co https://cloudflareinsights.com https://www.google-analytics.com ws://155.248.224.133:3001 http://155.248.224.133:3001 https://api.mozbet.online wss://api.mozbet.online https://mpesaemolatech.com",
              "frame-ancestors 'self'",
            ].join("; ") + ";",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // Proxy WebSocket para a VPS (Oracle Cloud)
  async rewrites() {
    return [
      {
        source: "/socket.io/:path*",
        destination: `${VPS_URL}/socket.io/:path*`,
      },
    ];
  },

  // Otimização de imagens
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [360, 414, 768, 1024, 1440],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "objectstorage.ca-montreal-1.oraclecloud.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
