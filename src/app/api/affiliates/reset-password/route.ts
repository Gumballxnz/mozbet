import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/auth-server";

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios." },
        { status: 400 }
      );
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: "A nova palavra-passe deve ter pelo menos 4 caracteres." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const affEmail = cleanEmail.startsWith("aff_") ? cleanEmail : `aff_${cleanEmail}`;

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

    if (new Date() > new Date(otpRecord.expires_at)) {

      await supabaseAdmin.from("otp_codes").delete().eq("id", otpRecord.id);
      return NextResponse.json(
        { error: "O código expirou. Solicita um novo código." },
        { status: 400 }
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ password_hash: hashedPassword })
      .eq("id", user.id);

    if (updateError) {
      console.error("[AFFILIATE RESET] Erro ao atualizar senha:", updateError);
      return NextResponse.json(
        { error: "Erro ao redefinir a palavra-passe." },
        { status: 500 }
      );
    }

    await supabaseAdmin.from("otp_codes").delete().eq("id", otpRecord.id);

    return NextResponse.json({
      success: true,
      message: "Palavra-passe redefinida com sucesso! Pode iniciar sessão.",
    });
  } catch (error) {
    console.error("[AFFILIATE RESET] Erro:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
