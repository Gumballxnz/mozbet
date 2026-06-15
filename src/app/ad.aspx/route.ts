import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pid = searchParams.get("pid");
    const bid = searchParams.get("bid");
    const redirectUrlStr = searchParams.get("redirectURL") || "/";

    let isValidAffiliate = false;
    if (pid) {
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

    // Detectar se o request é para carregar como Script JS (verificando cabeçalho Sec-Fetch-Dest ou Accept)
    const acceptHeader = req.headers.get("accept") || "";
    const isScript = acceptHeader.includes("javascript") || req.url.includes("script=true") || !searchParams.has("redirectURL");

    if (isScript && pid && isValidAffiliate) {
      // Retorna o script JS que renderiza o banner promocional na tela de terceiros
      const jsContent = `
        document.write('<a href="https://mozbet.online/redirect.aspx?pid=${pid}&bid=${bid || ''}" target="_blank"><img src="https://mozbet.online/renderimage.aspx?pid=${pid}&bid=${bid || ''}" style="max-width:100%; height:auto; border:0; display:inline-block;" alt="MozBet Promo"/></a>');
      `;
      return new NextResponse(jsContent, {
        headers: {
          "Content-Type": "application/javascript",
          "Cache-Control": "public, max-age=3600"
        }
      });
    } else if (isScript) {
      // Script com PID inválido retorna vazio
      return new NextResponse("", {
        headers: {
          "Content-Type": "application/javascript"
        }
      });
    }

    // Caso contrário, funciona como redirecionamento
    let finalRedirectUrl = "/registar";
    if (redirectUrlStr && redirectUrlStr !== "/") {
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
    console.error("Erro na AdServer ad.aspx:", error);
    return NextResponse.redirect(new URL("/", req.url));
  }
}
