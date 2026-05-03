import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";
import { sendSMS, generateOTP, formatOTPMessage } from "@/lib/mozsms";
import { isValidPhone } from "@/lib/utils";

// Rate limit para evitar spam de SMS
const otpRateLimit = new Map<string, number>();
const OTP_COOLDOWN = 60 * 1000; // 60 segundos entre reenvios

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown";
    const { phone, purpose } = await req.json();

    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json({ error: "Número de telefone inválido." }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, "");

    // 1. Verificar limite diário (Máximo 3 SMS por dia por número ou IP)
    const today = new Date().toISOString().split("T")[0];
    
    const { count: dailyCount } = await supabaseAdmin
      .from("otp_logs")
      .select("*", { count: "exact", head: true })
      .or(`phone.eq.${cleanPhone},ip_address.eq.${ip}`)
      .eq("sent_at", today);

    if ((dailyCount || 0) >= 3) {
      return NextResponse.json(
        { error: "Limite diário de SMS atingido para este número ou dispositivo. Tente novamente amanhã." },
        { status: 429 }
      );
    }

    // 2. Cooldown: impedir envio de SMS em menos de 60s (Rate limit simples)
    const lastSent = otpRateLimit.get(cleanPhone);
    if (lastSent && Date.now() - lastSent < OTP_COOLDOWN) {
      const remaining = Math.ceil((OTP_COOLDOWN - (Date.now() - lastSent)) / 1000);
      return NextResponse.json(
        { error: `Aguarde ${remaining} segundos antes de solicitar um novo código.` },
        { status: 429 }
      );
    }

    // 3. Para recuperação de senha, verificar se o número existe
    if (purpose === "reset") {
      const { data: existingUser } = await supabaseAdmin.from("users").select("id").eq("phone", cleanPhone).single();
      if (!existingUser) {
        return NextResponse.json({ error: "Este número não está registado." }, { status: 404 });
      }
    }

    // 4. Gerar e Salvar Código
    const code = generateOTP();
    await supabaseAdmin.from("otp_codes").delete().eq("phone", cleanPhone);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { error: dbError } = await supabaseAdmin.from("otp_codes").insert({
      phone: cleanPhone,
      code: code,
      expires_at: expiresAt,
    });

    if (dbError) {
      return NextResponse.json({ error: "Erro interno ao gerar código." }, { status: 500 });
    }

    // 5. Enviar SMS via MOZE SMS
    const smsResult = await sendSMS(cleanPhone, formatOTPMessage(code));

    if (!smsResult.success) {
      return NextResponse.json({ error: "Erro ao enviar SMS. Tente novamente." }, { status: 502 });
    }

    // 6. Registrar Log de Envio (Ponto de Segurança)
    await supabaseAdmin.from("otp_logs").insert({
      phone: cleanPhone,
      ip_address: ip,
      sent_at: today
    });

    // Marcar rate limit em memória
    otpRateLimit.set(cleanPhone, Date.now());

    return NextResponse.json({
      message: "Código enviado por SMS.",
      expiresIn: 300,
    });
  } catch (error) {
    console.error("[OTP] Erro:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
