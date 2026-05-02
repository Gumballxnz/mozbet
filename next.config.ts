import type { NextConfig } from "next";

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
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' blob: data: https://res.cloudinary.com https://api.dicebear.com https://objectstorage.ca-montreal-1.oraclecloud.com; connect-src 'self' wss://*.supabase.co https://*.supabase.co ws://155.248.224.133:3001 http://155.248.224.133:3001; frame-ancestors 'self';",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // Proxy WebSocket/Socket.io para a VPS para evitar erros de Mixed Content (HTTPS -> HTTP)
  async rewrites() {
    return [
      {
        source: "/socket.io/:path*",
        destination: "http://155.248.224.133:3001/socket.io/:path*",
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
        hostname: "res.cloudinary.com",
        pathname: "/dm3glrwax/**",
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
