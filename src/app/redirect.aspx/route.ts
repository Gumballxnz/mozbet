import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pid = searchParams.get("pid");
    const redirectUrlStr = searchParams.get("redirectURL");

    // Se não tem redirectURL, redirecionar para a página de registro por padrão
    // Inclui o pid como query param para rastreamento visual na página de registo
    let finalRedirectUrl = "/registar";
    
    if (redirectUrlStr) {
      // Tratar redirectUrl seguro para evitar open redirect para sites maliciosos
      if (redirectUrlStr.startsWith("/") || redirectUrlStr.includes("mozbet.online")) {
        finalRedirectUrl = redirectUrlStr;
      }
    }

    // Adicionar o pid como query param na URL de destino para rastreamento visual
    if (pid) {
      const separator = finalRedirectUrl.includes("?") ? "&" : "?";
      finalRedirectUrl = `${finalRedirectUrl}${separator}ref=${pid}`;
    }

    const response = NextResponse.redirect(new URL(finalRedirectUrl, req.url));

    if (pid) {
      // Injeta o cookie de indicação do afiliado (válido por 30 dias)
      response.cookies.set("affiliate_pid", pid, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 dias
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    }

    return response;
  } catch (error) {
    console.error("Erro no redirect de afiliados:", error);
    return NextResponse.redirect(new URL("/registar", req.url));
  }
}

