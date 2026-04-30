import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";
import { sendSMS, generateOTP, formatOTPMessage } from "@/lib/mozsms";
import { isValidPhone } from "@/lib/utils";

// Rate limit para evitar spam de SMS
const otpRateLimit = new Map<string, number>();
const OTP_COOLDOWN = 60 * 1000; // 60 segundos entre reenvios

export async function POST(req: Request) {
  try {
    const { phone, purpose } = await req.json();
    // purpose: "register" | "reset"

    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json(
        { error: "Número de telefone inválido." },
        { status: 400 }
      );
    }

    const cleanPhone = phone.replace(/\D/g, "");

    // Rate limit: impedir envio de SMS em menos de 60s
    const lastSent = otpRateLimit.get(cleanPhone);
    if (lastSent && Date.now() - lastSent < OTP_COOLDOWN) {
      const remaining = Math.ceil((OTP_COOLDOWN - (Date.now() - lastSent)) / 1000);
      return NextResponse.json(
        { error: `Aguarde ${remaining} segundos antes de solicitar um novo código.` },
        { status: 429 }
      );
    }

    // Para recuperação de senha, verificar se o número existe
    if (purpose === "reset") {
      const { data: existingUser } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("phone", cleanPhone)
        .single();

      if (!existingUser) {
        return NextResponse.json(
          { error: "Este número não está registado." },
          { status: 404 }
        );
      }
    }

    // Gerar código OTP de 6 dígitos
    const code = generateOTP();

    // Limpar códigos antigos deste número
    await supabaseAdmin
      .from("otp_codes")
      .delete()
      .eq("phone", cleanPhone);

    // Guardar o novo código no banco (expira em 5 minutos)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: dbError } = await supabaseAdmin
      .from("otp_codes")
      .insert({
        phone: cleanPhone,
        code: code,
        expires_at: expiresAt,
      });

    if (dbError) {
      console.error("[OTP] Erro ao guardar código:", dbError);
      return NextResponse.json(
        { error: "Erro interno ao gerar código." },
        { status: 500 }
      );
    }

    // Enviar SMS via MOZE SMS
    const smsResult = await sendSMS(cleanPhone, formatOTPMessage(code));

    if (!smsResult.success) {
      return NextResponse.json(
        { error: "Erro ao enviar SMS. Tente novamente." },
        { status: 502 }
      );
    }

    // Marcar rate limit
    otpRateLimit.set(cleanPhone, Date.now());

    return NextResponse.json({
      message: "Código enviado por SMS.",
      expiresIn: 300, // 5 minutos em segundos
    });
  } catch (error) {
    console.error("[OTP] Erro:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
