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

    const acceptHeader = req.headers.get("accept") || "";
    const isScript = acceptHeader.includes("javascript") || req.url.includes("script=true") || !searchParams.has("redirectURL");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const appName = process.env.NEXT_PUBLIC_APP_NAME || "MozBet";
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "";

    if (isScript && pid && isValidAffiliate) {
      const jsContent = `
        document.write('<a href="${appUrl}/redirect.aspx?pid=${pid}&bid=${bid || ''}" target="_blank"><img src="${appUrl}/renderimage.aspx?pid=${pid}&bid=${bid || ''}" style="max-width:100%; height:auto; border:0; display:inline-block;" alt="${appName} Promo"/></a>');
      `;
      return new NextResponse(jsContent, {
        headers: {
          "Content-Type": "application/javascript",
          "Cache-Control": "public, max-age=3600"
        }
      });
    } else if (isScript) {
      return new NextResponse("", {
        headers: {
          "Content-Type": "application/javascript"
        }
      });
    }

    let finalRedirectUrl = "/registar";
    if (redirectUrlStr && redirectUrlStr !== "/") {
      if (redirectUrlStr.startsWith("/") || (appDomain && redirectUrlStr.includes(appDomain))) {
        finalRedirectUrl = redirectUrlStr;
      }
    }

    if (pid && !isValidAffiliate) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (pid && isValidAffiliate) {
      const separator = finalRedirectUrl.includes("?") ? "&" : "?";
      finalRedirectUrl = `${finalRedirectUrl}${separator}ref=${pid}`;
    }

    const response = NextResponse.redirect(new URL(finalRedirectUrl, req.url));

    if (pid && isValidAffiliate) {
      response.cookies.set("affiliate_pid", pid, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
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
