import type { NextConfig } from "next";

const socketUrl =
  process.env.VPS_SOCKET_URL ||
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  "http://localhost:3001";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
let extraConnectSrc = "";
if (socketUrl) {
  try {
    const parsed = new URL(socketUrl);
    const wsProto = parsed.protocol === "https:" ? "wss:" : "ws:";
    extraConnectSrc = `${socketUrl} ${wsProto}//${parsed.host}`;
  } catch {
    extraConnectSrc = socketUrl;
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  compress: true,

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
              `img-src 'self' blob: data: https://api.dicebear.com https://objectstorage.ca-montreal-1.oraclecloud.com https://www.google-analytics.com https://www.googletagmanager.com ${appUrl}`.trim(),
              `connect-src 'self' wss://*.supabase.co https://*.supabase.co https://cloudflareinsights.com https://www.google-analytics.com https://mpesaemolatech.com ${extraConnectSrc}`.trim(),
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

  async rewrites() {
    return [
      {
        source: "/socket.io/:path*",
        destination: `${socketUrl}/socket.io/:path*`,
      },
    ];
  },

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
