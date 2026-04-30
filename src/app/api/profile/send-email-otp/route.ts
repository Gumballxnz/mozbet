import { NextResponse } from "next/server";
import { Resend } from "resend";
import { verifyToken, supabaseAdmin } from "@/lib/auth-server";
import { generateOTP } from "@/lib/mozsms"; // Reusing the 6-digit generator

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

// Rate limit para evitar spam de emails
const emailRateLimit = new Map<string, number>();
const EMAIL_COOLDOWN = 60 * 1000; // 60 segundos entre reenvios

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie");
    const sessionCookie = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("mozbet_session="));
    const token = sessionCookie?.split("=")[1];

    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const decoded = await verifyToken<{ id: string; phone: string }>(token);
    if (!decoded) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }

    // Rate limit
    const lastSent = emailRateLimit.get(email);
    if (lastSent && Date.now() - lastSent < EMAIL_COOLDOWN) {
      const remaining = Math.ceil((EMAIL_COOLDOWN - (Date.now() - lastSent)) / 1000);
      return NextResponse.json(
        { error: `Aguarde ${remaining} segundos antes de pedir novo código.` },
        { status: 429 }
      );
    }
    emailRateLimit.set(email, Date.now());

    // 1. Gerar código
    const code = generateOTP();

    // 2. Limpar códigos antigos deste email
    await supabaseAdmin
      .from("otp_codes")
      .delete()
      .eq("phone", email); // Usamos a coluna phone para guardar o email temporariamente

    // 3. Guardar no banco (expira em 5 min)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { error: dbError } = await supabaseAdmin
      .from("otp_codes")
      .insert({ phone: email, code, expires_at: expiresAt });

    if (dbError) throw dbError;

    // 4. Enviar email com Resend
    try {
      await resend.emails.send({
        from: "MozBet Suporte <onboarding@resend.dev>", // Sandbox
        to: [email],
        subject: "Código de Verificação MozBet",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #111; color: #fff; padding: 20px; border-radius: 10px;">
            <h1 style="color: #00FF7F; text-align: center;">MOZBET</h1>
            <p>Olá,</p>
            <p>Usaste este e-mail para atualizar o teu perfil na MozBet. Para confirmar que este e-mail te pertence, introduz o seguinte código de segurança de 6 dígitos:</p>
            <div style="background-color: #222; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 8px; margin: 20px 0;">
              ${code}
            </div>
            <p style="font-size: 12px; color: #888;">Este código expira em 5 minutos. Se não pediste isto, ignora este e-mail.</p>
          </div>
        `,
      });
      console.log(`Email OTP ${code} enviado para ${email}`);
    } catch (emailError: any) {
      console.error("Erro da Resend:", emailError);
      return NextResponse.json({ error: "Erro ao enviar e-mail. Verifica o teu plano Resend." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Código enviado!" });
  } catch (err: any) {
    console.error("Erro ao gerar OTP de email:", err);
    return NextResponse.json({ error: "Ocorreu um erro no servidor." }, { status: 500 });
  }
}
