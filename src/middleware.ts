import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("mozbet_session")?.value;
  const url = request.nextUrl.pathname;
  const origin = request.headers.get("origin") || "";

  const host = request.headers.get("host") || "";
  const isAffiliatesSubdomain = host.startsWith("afiliados.");
  const isAdminSubdomain = host.startsWith("admin.");
  const isAdminRewrite = request.headers.get("x-is-admin-subdomain") === "true";

  if (!isAdminSubdomain && (url === "/admin" || url.startsWith("/admin/"))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isAdminSubdomain) {
    if (isAdminRewrite) {
      return NextResponse.next();
    }

    const isStaticFile = url.includes(".") || url.startsWith("/_next/") || url.includes("/api/") || url === "/icon.svg" || url === "/favicon.ico";
    if (isStaticFile) {
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

      return NextResponse.rewrite(new URL("/404", request.url));
    }

    if (url === "/admin" || url.startsWith("/admin/")) {
      let cleanPath = url.replace(/^\/admin/, "");
      if (!cleanPath) cleanPath = "/";
      return NextResponse.redirect(new URL(cleanPath, request.url));
    }

    let targetUrlAdmin = url === "/" ? "/admin" : `/admin${url}`;

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-is-admin-subdomain", "true");

    return NextResponse.rewrite(new URL(targetUrlAdmin, request.url), {
      request: {
        headers: requestHeaders,
      }
    });
  }

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

  const isLocalhost = request.url.includes("localhost") || origin.includes("localhost") || origin.includes("127.0.0.1");
  const isConfiguredDomain = APP_DOMAIN ? origin.includes(APP_DOMAIN) : false;
  const isConfiguredAppUrl = APP_URL ? origin === APP_URL : false;
  const isAllowedOrigin = !origin || isLocalhost || isConfiguredDomain || isConfiguredAppUrl;

  if (url.startsWith("/api/")) {
    if (origin && !isAllowedOrigin) {
      console.warn(`[SEGURANÇA] Bloqueio de Clone/API Request externo: Origin=${origin} URL=${request.url}`);
      return new NextResponse(
        JSON.stringify({ error: "Acesso à API bloqueado por política CORS.", origin }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }

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

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-is-affiliate-subdomain", isAffiliatesSubdomain ? "true" : "false");
  requestHeaders.set("x-is-affiliate-route", targetUrl.startsWith("/afiliados") ? "true" : "false");

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

  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

  if (origin && isAllowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  return response;
}

export const config = {
  matcher: [

    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
