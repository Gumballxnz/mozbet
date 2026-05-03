import { NextResponse } from "next/server";
import { verifyToken, supabaseAdmin } from "@/lib/auth-server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie");
    const sessionCookie = cookieHeader?.split("; ").find((row) => row.startsWith("mozbet_session="));
    const token = sessionCookie?.split("=")[1];

    if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const decoded = await verifyToken<{ id: string; phone: string }>(token);
    if (!decoded) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

    const { otp, newPassword } = await req.json();

    if (!otp || !newPassword) {
      return NextResponse.json({ error: "Dados em falta." }, { status: 400 });
    }

    // Buscar email do user
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("id", decoded.id)
      .single();

    if (!user?.email) return NextResponse.json({ error: "E-mail não encontrado." }, { status: 400 });

    // 1. Verificar OTP
    const { data: otpRecord } = await supabaseAdmin
      .from("otp_codes")
      .select("*")
      .eq("phone", user.email)
      .eq("code", otp)
      .single();

    if (!otpRecord) return NextResponse.json({ error: "Código incorreto." }, { status: 400 });
    if (new Date() > new Date(otpRecord.expires_at)) return NextResponse.json({ error: "Código expirou." }, { status: 400 });

    // 2. Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 3. Atualizar senha
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ password: hashedPassword })
      .eq("id", decoded.id);

    if (updateError) throw updateError;

    // Limpar OTP
    await supabaseAdmin.from("otp_codes").delete().eq("id", otpRecord.id);

    return NextResponse.json({ success: true, message: "Senha atualizada com sucesso!" });
  } catch (err: any) {
    console.error("Erro ao atualizar senha:", err);
    return NextResponse.json({ error: "Erro ao atualizar senha." }, { status: 500 });
  }
}
