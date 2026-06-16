import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: "E-mail e código são obrigatórios." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const affEmail = cleanEmail.startsWith("aff_") ? cleanEmail : `aff_${cleanEmail}`;

    // 1. Verificar se o afiliado existe
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id, is_affiliate")
      .eq("email", affEmail)
      .eq("is_affiliate", true)
      .maybeSingle();

    if (!user) {
      return NextResponse.json(
        { error: "Conta de afiliado não encontrada." },
        { status: 404 }
      );
    }

    // 2. Verificar código OTP (sem apagar - será apagado ao redefinir a senha)
    const { data: otpRecord } = await supabaseAdmin
      .from("otp_codes")
      .select("*")
      .eq("phone", affEmail)
      .eq("code", otp.trim())
      .single();

    if (!otpRecord) {
      return NextResponse.json(
        { error: "Código incorreto. Verifica e tenta novamente." },
        { status: 400 }
      );
    }

    // 3. Verificar se o código expirou
    if (new Date() > new Date(otpRecord.expires_at)) {
      await supabaseAdmin.from("otp_codes").delete().eq("id", otpRecord.id);
      return NextResponse.json(
        { error: "O código expirou. Solicita um novo código." },
        { status: 400 }
      );
    }

    // Código válido - não apagar ainda (será usado na etapa de reset)
    return NextResponse.json({
      success: true,
      message: "Código verificado com sucesso!",
    });
  } catch (error) {
    console.error("[AFFILIATE VERIFY CODE] Erro:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
