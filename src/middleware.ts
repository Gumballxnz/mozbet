import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("mozbet_session")?.value;
  const url = request.nextUrl.pathname;

  // Rotas protegidas que exigem login básico
  const isUserRoute = url.startsWith("/perfil") || url.startsWith("/depositar");
  const isAdminRoute = url.startsWith("/admin");

  if (isUserRoute || isAdminRoute) {
    if (!token) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    try {
      const secret = process.env.JWT_SECRET || "default-dev-secret-key-do-not-use-in-production-123456789";
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      
      // Se a rota for admin, verificar a flag isAdmin no Payload JWT
      if (isAdminRoute && !payload.isAdmin) {
        return NextResponse.redirect(new URL("/", request.url));
      }
      
      return NextResponse.next();
    } catch (error) {
      // Token inválido ou expirado
      const response = NextResponse.redirect(new URL("/", request.url));
      response.cookies.delete("mozbet_session");
      return response;
    }
  }

  // Rotas de API - Proteção contra CSRF/CORS básico
  if (url.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    // Em produção, você pode restringir o origin apenas ao seu domínio
    // if (process.env.NODE_ENV === "production" && origin !== "https://mozbet.online") {
    //   return new NextResponse("Forbidden", { status: 403 });
    // }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/perfil/:path*",
    "/depositar/:path*",
    "/admin/:path*",
    "/api/:path*",
  ],
};
