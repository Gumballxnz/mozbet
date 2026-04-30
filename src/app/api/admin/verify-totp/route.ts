// Rota para verificar o código TOTP do Google Authenticator
// Usada tanto para ativar o 2FA pela primeira vez como para login no admin

import { NextResponse } from "next/server";
import { supabaseAdmin, verifyToken, signToken } from "@/lib/auth-server";
import { verifyTOTP } from "@/lib/totp";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { code, phone: bodyPhone } = await req.json();

    if (!code || code.length !== 6) {
      return NextResponse.json({ error: "Código deve ter 6 dígitos." }, { status: 400 });
    }

    // Determinar o telefone do admin (via cookie ou body)
    let phone = bodyPhone;

    const cookieStore = await cookies();
    const token = cookieStore.get("mozbet_session")?.value;

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.phone) {
        phone = payload.phone as string;
      }
    }

    if (!phone) {
      return NextResponse.json({ error: "Sessão não encontrada." }, { status: 401 });
    }

    // Buscar segredo TOTP do utilizador
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id, phone, totp_secret, totp_enabled, is_admin, balance, has_deposited, created_at")
      .eq("phone", phone)
      .single();

    if (!user || !user.is_admin) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    if (!user.totp_secret) {
      return NextResponse.json({ error: "TOTP não configurado. Configure primeiro." }, { status: 400 });
    }

    // Verificar o código
    const isValid = verifyTOTP(user.totp_secret, code);

    if (!isValid) {
      return NextResponse.json({ error: "Código inválido ou expirado." }, { status: 401 });
    }

    // Se é a primeira vez (ativação)
    if (!user.totp_enabled) {
      await supabaseAdmin
        .from("users")
        .update({ totp_enabled: true })
        .eq("phone", phone);
    }

    // Gerar token de sessão admin com flag de 2FA verificado
    const adminToken = await signToken({
      id: user.id,
      phone: user.phone,
      isAdmin: true,
      totpVerified: true,
    });

    const response = NextResponse.json({
      message: user.totp_enabled ? "Login admin verificado!" : "TOTP ativado com sucesso!",
      verified: true,
      firstTime: !user.totp_enabled,
      user: {
        id: user.id,
        phone: user.phone,
        balance: Number(user.balance),
        hasDeposited: user.has_deposited,
        createdAt: user.created_at,
      },
    });

    // Atualizar cookie com token que tem totpVerified
    response.cookies.set("mozbet_session", adminToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("[TOTP Verify] Erro:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
