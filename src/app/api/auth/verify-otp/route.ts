import { NextResponse } from "next/server";
import { supabaseAdmin, signToken } from "@/lib/auth-server";

export async function POST(req: Request) {
  try {
    const { phone, code, purpose } = await req.json();

    if (!phone || !code) {
      return NextResponse.json(
        { error: "Código e número são obrigatórios." },
        { status: 400 }
      );
    }

    const cleanPhone = phone.replace(/\D/g, "");

    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from("otp_codes")
      .select("*")
      .eq("phone", cleanPhone)
      .eq("code", code)
      .single();

    if (otpError || !otpRecord) {
      return NextResponse.json(
        { error: "Código inválido. Verifique e tente novamente." },
        { status: 400 }
      );
    }

    if (new Date(otpRecord.expires_at) < new Date()) {

      await supabaseAdmin
        .from("otp_codes")
        .delete()
        .eq("id", otpRecord.id);

      return NextResponse.json(
        { error: "Código expirado. Solicite um novo." },
        { status: 410 }
      );
    }

    await supabaseAdmin
      .from("otp_codes")
      .delete()
      .eq("id", otpRecord.id);

    if (purpose === "register") {

      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({ is_verified: true })
        .eq("phone", cleanPhone);

      if (updateError) {
        console.error("[OTP] Erro ao verificar utilizador:", updateError);
        return NextResponse.json(
          { error: "Erro ao verificar conta." },
          { status: 500 }
        );
      }

      const { data: user } = await supabaseAdmin
        .from("users")
        .select("id, phone, email, balance, has_deposited, created_at, is_admin")
        .eq("phone", cleanPhone)
        .single();

      if (!user) {
        return NextResponse.json({ error: "Utilizador não encontrado." }, { status: 404 });
      }

      const token = await signToken({
        id: user.id,
        phone: user.phone,
        isAdmin: user.is_admin,
      });

      const response = NextResponse.json({
        message: "Número verificado com sucesso!",
        verified: true,
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          balance: Number(user.balance),
          hasDeposited: user.has_deposited,
          createdAt: user.created_at,
        },
      });

      response.cookies.set("mozbet_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        domain: process.env.COOKIE_DOMAIN || undefined,
      });

      return response;
    }

    if (purpose === "reset") {

      const resetToken = await signToken({
        phone: cleanPhone,
        purpose: "reset",
      });

      return NextResponse.json({
        message: "Código verificado. Pode redefinir a sua palavra-passe.",
        verified: true,
        resetToken,
      });
    }

    return NextResponse.json({ error: "Operação inválida." }, { status: 400 });
  } catch (error) {
    console.error("[OTP] Erro na verificação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
