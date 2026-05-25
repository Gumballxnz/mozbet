import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Adiciona os domínios permitidos em produção.
// Quando fizeres o deploy final (ex: mozbet.online), altera aqui.
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://mozbet.online",
  "https://www.mozbet.online",
  "https://mozbet-test.vercel.app",
];

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("mozbet_session")?.value;
  const url = request.nextUrl.pathname;
  const origin = request.headers.get("origin") || "";

  // 1. ROTAS DE API — Proteção CORS e Anti-Clone Estrita
  if (url.startsWith("/api/")) {
    const isLocalhost = request.url.includes("localhost");
    // SEGURANÇA: Apenas aceitar deploys Vercel com prefixo "mozbet-" (evita clones em *.vercel.app)
    const isVercelAllowed = origin.startsWith("https://mozbet-") && origin.endsWith(".vercel.app");
    
    // Se for um pedido de outra origem e não estiver na lista permitida, bloqueia!
    if (origin && !ALLOWED_ORIGINS.includes(origin) && !isLocalhost && !isVercelAllowed) {
      console.warn(`[SEGURANÇA] Bloqueio de Clone/API Request externo: Origin=${origin} URL=${request.url}`);
      return new NextResponse(
        JSON.stringify({ error: "Acesso à API bloqueado por política CORS estrita.", origin }),
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
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error("[SEGURANÇA] JWT_SECRET não definido no middleware!");
        return NextResponse.redirect(new URL("/", request.url));
      }
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      
      // Se a rota for admin, verificar se é admin no Payload JWT
      // O token usa o campo "isAdmin" (não "role")
      if (isAdminRoute && !payload.isAdmin) {
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
  response.headers.set("X-Frame-Options", "SAMEORIGIN"); // Permite embed apenas do próprio site (mesma origem)
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
