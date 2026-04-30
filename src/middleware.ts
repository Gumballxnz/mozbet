import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Adiciona os domínios permitidos em produção.
// Quando fizeres o deploy final (ex: mozbet.online), altera aqui.
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://mozbet-production.vercel.app", // Substituir pelo domínio final real
];

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("mozbet_session")?.value;
  const url = request.nextUrl.pathname;
  const origin = request.headers.get("origin") || "";

  // 1. ROTAS DE API — Proteção CORS e Anti-Clone Estrita
  if (url.startsWith("/api/")) {
    const isLocalhost = request.url.includes("localhost");
    
    // Se for um pedido de outra origem e não estiver na lista permitida, bloqueia!
    // Exceção feita a pedidos vindos do próprio servidor (SSR) onde o origin não vem.
    if (origin && !ALLOWED_ORIGINS.includes(origin) && !isLocalhost) {
      console.warn(`[SEGURANÇA] Bloqueio de Clone/API Request externo: ${origin}`);
      return new NextResponse(
        JSON.stringify({ error: "Acesso à API bloqueado por política CORS estrita." }),
        { 
          status: 403, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }
  }

  // 2. PROTEÇÃO DE ROTAS (Autenticação Básica e Admin)
  const isUserRoute = url.startsWith("/perfil") || url.startsWith("/depositar");
  const isAdminRoute = url.startsWith("/admin");

  // O painel admin de login não precisa do token válido (caso contrário cria loop)
  if (url === "/admin/login") {
    return NextResponse.next();
  }

  if (isUserRoute || isAdminRoute) {
    if (!token) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    try {
      const secret = process.env.JWT_SECRET || "default-dev-secret-key-do-not-use-in-production-123456789";
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      
      // Se a rota for admin, verificar a role "admin" no Payload JWT
      if (isAdminRoute && payload.role !== "admin") {
        return NextResponse.redirect(new URL("/", request.url));
      }
      
      return NextResponse.next();
    } catch (error) {
      // Token inválido, forjado ou expirado
      const response = NextResponse.redirect(new URL("/", request.url));
      response.cookies.delete("mozbet_session");
      return response;
    }
  }

  // Permite o seguimento normal para rotas públicas e adiciona headers de segurança dinâmicos
  const response = NextResponse.next();
  
  // Reforço extra caso o NextConfig não consiga injetar nalgumas rotas
  response.headers.set("X-Frame-Options", "DENY"); // Bloqueia iframe clone
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

  // Headers de CORS permitidos para a aplicação
  if (origin && (ALLOWED_ORIGINS.includes(origin) || request.url.includes("localhost"))) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
