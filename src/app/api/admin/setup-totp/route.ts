import { NextResponse } from "next/server";
import { supabaseAdmin, verifyToken } from "@/lib/auth-server";
import { generateTOTPSecret } from "@/lib/totp";
import { cookies } from "next/headers";
import QRCode from "qrcode";

export async function POST(req: Request) {
  try {

    const cookieStore = await cookies();
    const token = cookieStore.get("mozbet_session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    const payload = await verifyToken<{ id: string; phone: string; isAdmin: boolean }>(token);
    if (!payload || !payload.isAdmin) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const phone = payload.phone as string;

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("totp_secret, totp_enabled")
      .eq("phone", phone)
      .single();

    if (user?.totp_enabled) {
      return NextResponse.json({
        message: "TOTP já está configurado. Use o código do Authenticator para entrar.",
        alreadyEnabled: true,
      }, { status: 200 });
    }

    const { secret, uri } = generateTOTPSecret(phone);

    await supabaseAdmin
      .from("users")
      .update({ totp_secret: secret, totp_enabled: false })
      .eq("phone", phone);

    const qrCodeDataUrl = await QRCode.toDataURL(uri, {
      width: 256,
      margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" },
    });

    return NextResponse.json({
      message: "Escaneie o QR Code com o Google Authenticator.",
      qrCode: qrCodeDataUrl,
      secret: secret,
      uri: uri,
    });
  } catch (error) {
    console.error("[TOTP Setup] Erro:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
