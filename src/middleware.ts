import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Adiciona os domínios permitidos em produção.
// Quando fizeres o deploy final (ex: mozbet.online), altera aqui.
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://admin.localhost:3000",
  "https://mozbet.online",
  "https://www.mozbet.online",
  "https://admin.mozbet.online",
  "https://afiliados.mozbet.online",
  "https://mozbet-test.vercel.app",
];

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("mozbet_session")?.value;
  const url = request.nextUrl.pathname;
  const origin = request.headers.get("origin") || "";

  // =======================================================
  // 0. TRATAMENTO DE SUBDOMÍNIOS (AFILIADOS E ADMIN)
  // =======================================================
  const host = request.headers.get("host") || "";
  const isAffiliatesSubdomain = host.startsWith("afiliados.mozbet.online") || host.startsWith("afiliados.localhost");
  const isAdminSubdomain = host.startsWith("admin.mozbet.online") || host.startsWith("admin.localhost");
  const isAdminRewrite = request.headers.get("x-is-admin-subdomain") === "true";

  // Se for acesso direto ao /admin no domínio principal, redirecionar para a home
  if (!isAdminSubdomain && (url === "/admin" || url.startsWith("/admin/"))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Tratamento do subdomínio Admin
  if (isAdminSubdomain) {
    if (isAdminRewrite) {
      return NextResponse.next();
    }

    let isAdmin = false;
    if (token) {
      try {
        const secret = process.env.JWT_SECRET;
        if (secret) {
          const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
          if (payload.isAdmin) {
            isAdmin = true;
          }
        }
      } catch (err) {
        console.error("[Middleware Admin] Erro ao decodificar token:", err);
      }
    }

    if (!isAdmin) {
      // Retorna 404 silencioso para membros comuns ou não logados
      return NextResponse.rewrite(new URL("/404", request.url));
    }

    // Se o admin acessar explicitamente /admin no subdomínio, removemos o prefixo da URL do navegador
    if (url === "/admin" || url.startsWith("/admin/")) {
      let cleanPath = url.replace(/^\/admin/, "");
      if (!cleanPath) cleanPath = "/";
      return NextResponse.redirect(new URL(cleanPath, request.url));
    }

    const isStaticFile = url.includes(".") || url.startsWith("/_next/") || url.includes("/api/") || url === "/icon.svg" || url === "/favicon.ico";
    if (isStaticFile) {
      return NextResponse.next();
    }

    // Rewrite interno de admin.mozbet.online/* para /admin/*
    let targetUrlAdmin = url === "/" ? "/admin" : `/admin${url}`;

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-is-admin-subdomain", "true");

    return NextResponse.rewrite(new URL(targetUrlAdmin, request.url), {
      request: {
        headers: requestHeaders,
      }
    });
  }

  // Tratamento do subdomínio de Afiliados
  if (isAffiliatesSubdomain && (url === "/afiliados" || url.startsWith("/afiliados/"))) {
    let cleanPath = url.replace(/^\/afiliados/, "");
    if (!cleanPath) cleanPath = "/";
    return NextResponse.redirect(new URL(cleanPath, request.url));
  }
  
  let targetUrl = url;
  if (isAffiliatesSubdomain) {
    const isStaticFile = url.includes(".") || url.startsWith("/_next/") || url.includes("/api/") || url === "/icon.svg" || url === "/favicon.ico";
    if (url === "/") {
      targetUrl = "/afiliados";
    } else if (!url.startsWith("/afiliados") && !url.startsWith("/api/") && !isStaticFile) {
      targetUrl = `/afiliados${url}`;
    }
  }

  // =======================================================
  // 1. PROTEÇÃO DE ROTAS DE AFILIADOS Restritas
  // =======================================================
  const isAffiliateRoute = targetUrl === "/afiliados" || (targetUrl.startsWith("/afiliados/") && !targetUrl.startsWith("/afiliados/login") && !targetUrl.startsWith("/afiliados/registar"));

  if (isAffiliateRoute) {
    const affiliateToken = request.cookies.get("mozbet_affiliate_session")?.value;
    if (!affiliateToken) {
      const redirectPath = isAffiliatesSubdomain ? "/login" : "/afiliados/login";
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error("JWT_SECRET não definido no middleware!");
      }
      const { payload } = await jwtVerify(affiliateToken, new TextEncoder().encode(secret));
      if (!payload.isAffiliate) {
        throw new Error("Token não pertence a um afiliado");
      }
    } catch (error) {
      const redirectPath = isAffiliatesSubdomain ? "/login" : "/afiliados/login";
      const response = NextResponse.redirect(new URL(redirectPath, request.url));
      response.cookies.delete("mozbet_affiliate_session");
      return response;
    }
  }

  // 2. ROTAS DE API — Proteção CORS e Anti-Clone Estrita
  if (url.startsWith("/api/")) {
    const isLocalhost = request.url.includes("localhost");
    const isVercelAllowed = origin.startsWith("https://mozbet-") && origin.endsWith(".vercel.app");
    const isOfficialDomain = origin.endsWith("mozbet.online");
    
    if (origin && !ALLOWED_ORIGINS.includes(origin) && !isLocalhost && !isVercelAllowed && !isOfficialDomain) {
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

  // 3. PROTEÇÃO DE ROTAS (Autenticação Básica do site principal)
  const isUserRoute = url.startsWith("/perfil") || url.startsWith("/depositar");

  if (isUserRoute) {
    if (!token) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error("[SEGURANÇA] JWT_SECRET não definido no middleware!");
        return NextResponse.redirect(new URL("/", request.url));
      }
      await jwtVerify(token, new TextEncoder().encode(secret));
      return NextResponse.next();
    } catch (error) {
      const response = NextResponse.redirect(new URL("/", request.url));
      response.cookies.delete("mozbet_session");
      return response;
    }
  }


  // Injetar headers na requisição para que os Server Components saibam se é subdomínio de afiliados
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-is-affiliate-subdomain", isAffiliatesSubdomain ? "true" : "false");
  requestHeaders.set("x-is-affiliate-route", targetUrl.startsWith("/afiliados") ? "true" : "false");

  // Permite o seguimento normal para rotas públicas e adiciona headers de segurança dinâmicos
  const response = (isAffiliatesSubdomain && targetUrl !== url)
    ? NextResponse.rewrite(new URL(targetUrl, request.url), {
        request: {
          headers: requestHeaders,
        }
      })
    : NextResponse.next({
        request: {
          headers: requestHeaders,
        }
      });
  
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
