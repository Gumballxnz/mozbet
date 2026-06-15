import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pid = searchParams.get("pid");
    const redirectUrlStr = searchParams.get("redirectURL");

    let finalRedirectUrl = "/registar";
    let isValidAffiliate = false;

    if (pid) {
      // Verificar no banco de dados se o afiliado de fato existe e está ativo
      const { data: affiliateUser } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("affiliate_code", pid)
        .eq("is_affiliate", true)
        .maybeSingle();

      if (affiliateUser) {
        isValidAffiliate = true;
      }
    }

    if (redirectUrlStr) {
      // Tratar redirectUrl seguro para evitar open redirect para sites maliciosos
      if (redirectUrlStr.startsWith("/") || redirectUrlStr.includes("mozbet.online")) {
        finalRedirectUrl = redirectUrlStr;
      }
    }

    // Se o afiliado for inválido, redireciona para a home por segurança
    if (pid && !isValidAffiliate) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Adicionar o pid como query param na URL de destino para rastreamento visual
    if (pid && isValidAffiliate) {
      const separator = finalRedirectUrl.includes("?") ? "&" : "?";
      finalRedirectUrl = `${finalRedirectUrl}${separator}ref=${pid}`;
    }

    const response = NextResponse.redirect(new URL(finalRedirectUrl, req.url));

    if (pid && isValidAffiliate) {
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
    return NextResponse.redirect(new URL("/", req.url));
  }
}

