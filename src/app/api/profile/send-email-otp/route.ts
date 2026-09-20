import { NextResponse } from "next/server";
import { Resend } from "resend";
import { verifyToken, supabaseAdmin } from "@/lib/auth-server";
import { generateOTP } from "@/lib/mozsms";

const emailRateLimit = new Map<string, number>();
const EMAIL_COOLDOWN = 60 * 1000;

export async function POST(req: Request) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json(
        { error: "Serviço de e-mail (Resend) não configurado no .env." },
        { status: 500 }
      );
    }
    const resend = new Resend(resendApiKey);
    const appName = process.env.NEXT_PUBLIC_APP_NAME || "MozBet";
    const fromEmail = process.env.EMAIL_FROM || `${appName} Suporte <suporte@exemplo.com>`;

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

    const lastSent = emailRateLimit.get(email);
    if (lastSent && Date.now() - lastSent < EMAIL_COOLDOWN) {
      const remaining = Math.ceil((EMAIL_COOLDOWN - (Date.now() - lastSent)) / 1000);
      return NextResponse.json(
        { error: `Aguarde ${remaining} segundos antes de pedir novo código.` },
        { status: 429 }
      );
    }
    emailRateLimit.set(email, Date.now());

    const code = generateOTP();

    await supabaseAdmin
      .from("otp_codes")
      .delete()
      .eq("phone", email);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { error: dbError } = await supabaseAdmin
      .from("otp_codes")
      .insert({ phone: email, code, expires_at: expiresAt });

    if (dbError) throw dbError;

    try {
      const { data: emailResult, error: emailError } = await resend.emails.send({
        from: fromEmail,
        to: [email],
        subject: `Código de Verificação - ${appName}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">

            <!-- HEADER BANNER -->
            <div style="background: linear-gradient(135deg, #00FF7F 0%, #008f47 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 900; letter-spacing: 2px; text-shadow: 0 2px 10px rgba(0,0,0,0.2);">
                MOZ<span style="color: #0f172a;">BET</span>
              </h1>
            </div>

            <!-- BODY -->
            <div style="padding: 40px 30px; text-align: center;">
              <h2 style="margin-top: 0; color: #ffffff; font-size: 20px;">Confirma o teu E-mail</h2>
              <p style="line-height: 1.6; color: #cbd5e1; font-size: 15px; margin-bottom: 30px;">
                Usaste este endereço para atualizar o teu perfil na plataforma. Para garantir a segurança da tua conta, introduz o seguinte código de 6 dígitos:
              </p>

              <div style="background-color: #1e293b; padding: 20px; border-radius: 12px; margin: 0 auto 30px auto; border: 1px dashed #00FF7F; display: inline-block;">
                <p style="margin: 0; font-size: 36px; font-weight: 900; color: #00FF7F; letter-spacing: 8px;">
                  ${code}
                </p>
              </div>

              <p style="font-size: 13px; color: #64748b; margin: 0;">
                Este código expira em 5 minutos. Se não fizeste este pedido, ignora este e-mail.
              </p>
            </div>

            <!-- FOOTER -->
            <div style="background-color: #020617; padding: 20px; text-align: center; border-top: 1px solid #1e293b;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} MozBet. Todos os direitos reservados.
              </p>
            </div>
          </div>
        `,
      });

      if (emailError) {
        console.error("Erro da Resend:", emailError);

        await supabaseAdmin.from("otp_codes").delete().eq("phone", email);

        const errorMsg = emailError.message?.toLowerCase() || "";
        if (errorMsg.includes("invalid") || errorMsg.includes("not found") || errorMsg.includes("bounce") || errorMsg.includes("rejected")) {
          return NextResponse.json({ error: "Este e-mail é inválido ou não existe. Verifica o endereço e tenta novamente." }, { status: 400 });
        }
        return NextResponse.json({ error: "Não foi possível enviar o e-mail. Verifica se o endereço está correto." }, { status: 400 });
      }

      console.log(`Email OTP ${code} enviado para ${email} (ID: ${emailResult?.id})`);
    } catch (emailError: any) {
      console.error("Erro da Resend (exceção):", emailError);

      await supabaseAdmin.from("otp_codes").delete().eq("phone", email);

      return NextResponse.json({ error: "E-mail inválido ou incorreto. Verifica o endereço." }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Código enviado!" });
  } catch (err: any) {
    console.error("Erro ao gerar OTP de email:", err);
    return NextResponse.json({ error: "Ocorreu um erro no servidor." }, { status: 500 });
  }
}
