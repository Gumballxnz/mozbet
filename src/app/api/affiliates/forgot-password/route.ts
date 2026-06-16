import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/auth-server";
import { generateOTP } from "@/lib/mozsms";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

// Rate limit simples em memória para evitar spam
const rateLimitMap = new Map<string, number>();
const COOLDOWN_MS = 60 * 1000; // 60 segundos entre reenvios

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Informe o e-mail da conta de afiliado." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // O e-mail do afiliado é salvo com prefixo aff_ no banco
    const affEmail = cleanEmail.startsWith("aff_") ? cleanEmail : `aff_${cleanEmail}`;

    // Rate limit: impedir reenvios rápidos
    const lastSent = rateLimitMap.get(affEmail);
    if (lastSent && Date.now() - lastSent < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - lastSent)) / 1000);
      return NextResponse.json(
        { error: `Aguarde ${remaining} segundos antes de solicitar um novo código.` },
        { status: 429 }
      );
    }

    // 1. Buscar afiliado pelo e-mail
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id, email, affiliate_name, is_affiliate")
      .eq("email", affEmail)
      .eq("is_affiliate", true)
      .maybeSingle();

    // Resposta genérica para não revelar se o email existe ou não (segurança)
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "Se o e-mail estiver registado como afiliado, receberá um código de recuperação.",
      });
    }

    // 2. Gerar código OTP de 6 dígitos
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutos

    // 3. Limpar OTPs antigos e inserir novo
    await supabaseAdmin.from("otp_codes").delete().eq("phone", affEmail);
    const { error: dbError } = await supabaseAdmin.from("otp_codes").insert({
      phone: affEmail, // Reutiliza o campo phone para guardar o identificador
      code,
      expires_at: expiresAt,
    });

    if (dbError) {
      console.error("[AFFILIATE FORGOT] Erro ao salvar OTP:", dbError);
      return NextResponse.json(
        { error: "Erro interno ao gerar código." },
        { status: 500 }
      );
    }

    // 4. Enviar e-mail com o código via Resend
    const displayName = user.affiliate_name || "Parceiro";
    // Usar o email real (sem o prefixo aff_)
    const realEmail = cleanEmail.startsWith("aff_") ? cleanEmail.replace("aff_", "") : cleanEmail;

    await resend.emails.send({
      from: "MozBet Segurança <suporte@mozbet.online>",
      to: [realEmail],
      subject: "Código de Recuperação de Senha - MozBet Partners",
      html: `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 550px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 30px rgba(0,0,0,0.5);">
          
          <!-- HEADER -->
          <div style="background: linear-gradient(135deg, #00FF7F 0%, #008f47 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: 2px; text-shadow: 0 2px 10px rgba(0,0,0,0.2);">
              MOZ<span style="color: #0f172a;">BET</span> PARTNERS
            </h1>
            <p style="color: #f0fdf4; font-size: 13px; font-weight: 500; margin: 8px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">
              Recuperação de Palavra-passe
            </p>
          </div>

          <!-- BODY -->
          <div style="padding: 35px 30px;">
            <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">Olá, ${displayName}!</h2>
            <p style="color: #cbd5e1; line-height: 1.6; font-size: 15px;">
              Recebemos um pedido para recuperar a palavra-passe da tua conta de afiliado. Usa o código abaixo para continuar:
            </p>
            
            <div style="background-color: #1e293b; padding: 25px; border-radius: 12px; text-align: center; margin: 30px 0; border: 1px dashed #00FF7F;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">O teu código de verificação</p>
              <span style="font-size: 36px; font-weight: 900; color: #00FF7F; letter-spacing: 8px; font-family: monospace;">${code}</span>
            </div>
            
            <p style="color: #94a3b8; font-size: 13px; text-align: center;">
              ⏱ Este código é válido por <strong style="color: #ffffff;">10 minutos</strong>.
            </p>
            
            <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 25px; border-top: 1px solid #1e293b; padding-top: 20px;">
              Se não fizeste este pedido, ignora este e-mail. A tua conta está segura.
            </p>
          </div>

          <!-- FOOTER -->
          <div style="background-color: #020617; padding: 20px; text-align: center; border-top: 1px solid #1e293b;">
            <p style="color: #475569; font-size: 11px; margin: 0;">
              © 2026 MozBet Partners. Todos os direitos reservados.
            </p>
          </div>
        </div>
      `,
    });

    // Registrar rate limit
    rateLimitMap.set(affEmail, Date.now());

    return NextResponse.json({
      success: true,
      message: "Se o e-mail estiver registado como afiliado, receberá um código de recuperação.",
    });
  } catch (error) {
    console.error("[AFFILIATE FORGOT] Erro:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
