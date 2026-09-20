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

    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "";
    if (redirectUrlStr) {
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
        domain: process.env.COOKIE_DOMAIN || undefined,
      });
    }

    return response;
  } catch (error) {
    console.error("Erro no redirect de afiliados:", error);
    return NextResponse.redirect(new URL("/", req.url));
  }
}
