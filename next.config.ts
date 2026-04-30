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
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // Otimização de imagens
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [360, 414, 768, 1024, 1440],
  },
};

export default nextConfig;
