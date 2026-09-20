import { NextResponse } from "next/server";
import { Resend } from "resend";
import { verifyToken, supabaseAdmin } from "@/lib/auth-server";

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

    const { email, otp, commercialOptIn, avatar } = await req.json();

    const { data: currentUser } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("id", decoded.id)
      .single();

    const isChangingEmail = email && email !== currentUser?.email;

    if (isChangingEmail) {
      if (!otp) {
        return NextResponse.json({ error: "Código de verificação em falta." }, { status: 400 });
      }

      const { data: otpRecord } = await supabaseAdmin
        .from("otp_codes")
        .select("*")
        .eq("phone", email)
        .eq("code", otp)
        .single();

      if (!otpRecord) {
        return NextResponse.json({ error: "Código incorreto." }, { status: 400 });
      }

      if (new Date() > new Date(otpRecord.expires_at)) {
        return NextResponse.json({ error: "O código expirou. Pede um novo." }, { status: 400 });
      }

      await supabaseAdmin.from("otp_codes").delete().eq("id", otpRecord.id);
    }

    const updateData: Record<string, unknown> = {};
    if (email !== undefined) updateData.email = email;
    if (commercialOptIn !== undefined) updateData.commercial_opt_in = commercialOptIn;
    if (avatar) updateData.avatar_url = avatar;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabaseAdmin
        .from("users")
        .update(updateData)
        .eq("id", decoded.id);

      if (error) throw error;
    }

    if (email && email.includes("@") && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const appName = process.env.NEXT_PUBLIC_APP_NAME || "MozBet";
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const fromEmail = process.env.EMAIL_FROM || `${appName} Suporte <suporte@exemplo.com>`;

        await resend.emails.send({
          from: fromEmail,
          to: [email],
          subject: `Bem-vindo à ${appName}! 🎉`,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">

              <!-- HEADER BANNER -->
              <div style="background: linear-gradient(135deg, #00FF7F 0%, #008f47 100%); padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 900; letter-spacing: 2px; text-shadow: 0 2px 10px rgba(0,0,0,0.2);">
                  ${appName.toUpperCase()}
                </h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px; font-weight: 500;">
                  Casino & Apostas Online
                </p>
              </div>

              <!-- BODY -->
              <div style="padding: 40px 30px;">
                <h2 style="margin-top: 0; color: #ffffff; font-size: 20px;">Olá jogador!</h2>
                <p style="line-height: 1.6; color: #cbd5e1; font-size: 16px;">
                  Obrigado por atualizares o teu perfil e adicionares o teu email à nossa plataforma. A tua conta está agora mais segura.
                </p>

                ${commercialOptIn ? `
                <div style="background-color: rgba(0, 255, 127, 0.1); border-left: 4px solid #00FF7F; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                  <p style="margin: 0; color: #e2e8f0; font-size: 14px; line-height: 1.5;">
                    🎉 Ficamos felizes por aceitares receber as nossas novidades! Fica atento a <strong>Bónus Exclusivos</strong>, <strong>Torneios</strong> e <strong>Ofertas de Depósito</strong> semanais.
                  </p>
                </div>
                ` : ''}

                <div style="background-color: #1e293b; padding: 20px; border-radius: 12px; margin-top: 30px; border: 1px solid #334155; text-align: center;">
                  <p style="margin: 0 0 10px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">O teu ID de Segurança</p>
                  <p style="margin: 0; font-size: 24px; font-weight: bold; color: #00FF7F; letter-spacing: 3px;">
                    ${decoded.id.split('-')[0].toUpperCase()}
                  </p>
                </div>

                <div style="text-align: center; margin-top: 40px;">
                  <a href="${appUrl}" style="background-color: #00FF7F; color: #0f172a; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block;">
                    Voltar a Jogar
                  </a>
                </div>
              </div>

              <!-- FOOTER -->
              <div style="background-color: #020617; padding: 20px; text-align: center; border-top: 1px solid #1e293b;">
                <p style="color: #64748b; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} ${appName}. Todos os direitos reservados.
                </p>
                <p style="color: #64748b; font-size: 10px; margin: 8px 0 0 0;">
                  Apenas para maiores de 18 anos. Joga com responsabilidade.
                </p>
              </div>
            </div>
          `,
        });
        console.log("Email enviado com sucesso via Resend para", email);
      } catch (emailError) {
        console.error("Erro ao enviar email pela Resend:", emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Erro no update do perfil:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
