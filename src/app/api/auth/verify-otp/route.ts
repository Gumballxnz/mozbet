import { NextResponse } from "next/server";
import { supabaseAdmin, signToken } from "@/lib/auth-server";

export async function POST(req: Request) {
  try {
    const { phone, code, purpose } = await req.json();
    // purpose: "register" | "reset"

    if (!phone || !code) {
      return NextResponse.json(
        { error: "Código e número são obrigatórios." },
        { status: 400 }
      );
    }

    const cleanPhone = phone.replace(/\D/g, "");

    // Buscar o código OTP mais recente para este número
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

    // Verificar se o código expirou
    if (new Date(otpRecord.expires_at) < new Date()) {
      // Apagar código expirado
      await supabaseAdmin
        .from("otp_codes")
        .delete()
        .eq("id", otpRecord.id);

      return NextResponse.json(
        { error: "Código expirado. Solicite um novo." },
        { status: 410 }
      );
    }

    // Código válido - apagar da tabela
    await supabaseAdmin
      .from("otp_codes")
      .delete()
      .eq("id", otpRecord.id);

    // VERIFICAÇÃO DE REGISTO
    if (purpose === "register") {
      // Marcar utilizador como verificado
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

      // Buscar dados do utilizador para gerar JWT
      const { data: user } = await supabaseAdmin
        .from("users")
        .select("id, phone, balance, has_deposited, created_at, is_admin")
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
      });

      return response;
    }

    // VERIFICAÇÃO PARA RESET DE SENHA
    if (purpose === "reset") {
      // Gerar um token temporário para permitir a alteração de senha
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
