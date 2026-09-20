import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { supabaseAdmin, signToken } from "@/lib/auth-server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, username, password, phone, playerId, saqueMethod, saqueNumber, saqueName, subCode } = body;

    if (!name || !email || !username || !password || !phone || !saqueMethod || !saqueNumber || !saqueName) {
      return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, "");
    const cleanSaqueNumber = saqueNumber.replace(/\D/g, "");

    const affPhone = `aff_${cleanPhone}`;
    const affEmail = `aff_${email.toLowerCase().trim()}`;

    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .or(`email.eq.${affEmail},phone.eq.${affPhone}`)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ error: "E-mail ou número de telefone já cadastrado no sistema de parceiros." }, { status: 400 });
    }

    const { data: existingUsername } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("username", username.toLowerCase().trim())
      .maybeSingle();

    if (existingUsername) {
      return NextResponse.json({ error: "Este nome de usuário já está em uso por outro parceiro." }, { status: 400 });
    }

    let parentAffiliateId: string | null = null;
    if (subCode) {
      const { data: parent } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("affiliate_code", subCode)
        .eq("is_affiliate", true)
        .maybeSingle();

      if (parent) {
        parentAffiliateId = parent.id;
      }
    }

    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    const affiliateCode = `MB${randomCode}`;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const affiliateDisplayName = saqueName && saqueName !== name
      ? `${name} | Titular: ${saqueName}`
      : name;

    const insertPayload: Record<string, unknown> = {
      email: affEmail,
      username: username.toLowerCase().trim(),
      phone: affPhone,
      password_hash: hashedPassword,
      is_affiliate: true,
      affiliate_code: affiliateCode,
      affiliate_name: affiliateDisplayName,
      affiliate_phone: cleanPhone,
      affiliate_saque_number: cleanSaqueNumber,
      affiliate_saque_method: saqueMethod,
      parent_affiliate_id: parentAffiliateId,
      is_verified: true,
      balance: 0.00,
      affiliate_balance: 0.00
    };

    const { data: newUser, error: dbError } = await supabaseAdmin
      .from("users")
      .insert([insertPayload])
      .select("id, email, affiliate_code")
      .single();

    if (dbError || !newUser) {
      console.error("Erro ao cadastrar afiliado no banco:", dbError);
      return NextResponse.json({ error: "Erro interno ao criar conta de afiliado." }, { status: 500 });
    }

    if (process.env.RESEND_API_KEY) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const appName = process.env.NEXT_PUBLIC_APP_NAME || "MozBet";
        const fromEmail = process.env.EMAIL_FROM || `${appName} Afiliados <suporte@exemplo.com>`;
        const directLink = `${appUrl}/redirect.aspx?pid=${affiliateCode}`;
        const subLink = `${appUrl}/afiliados/registar?sub=${affiliateCode}`;
        const supportContact = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "suporte da plataforma";

        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: fromEmail,
          to: [email],
          subject: `Bem-vindo ao Programa de Afiliados ${appName}! 🤝`,
          html: `
            <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 30px rgba(0,0,0,0.5);">

              <!-- HEADER -->
              <div style="background: linear-gradient(135deg, #00FF7F 0%, #008f47 100%); padding: 40px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 36px; font-weight: 900; letter-spacing: 2px; text-shadow: 0 2px 10px rgba(0,0,0,0.2);">
                  ${appName.toUpperCase()} PARTNERS
                </h1>
                <p style="color: #f0fdf4; font-size: 16px; font-weight: 500; margin: 10px 0 0 0;">
                  Programa Oficial de Afiliados
                </p>
              </div>

              <!-- BODY -->
              <div style="padding: 40px 30px;">
                <h2 style="color: #ffffff; font-size: 22px; margin-top: 0;">Olá, ${name}!</h2>
                <p style="color: #cbd5e1; line-height: 1.6; font-size: 15px;">
                  A tua conta de parceiro foi criada com sucesso! A partir de agora, tu recebes comissões sobre cada depósito feito pelos teus indicados.
                </p>

                <div style="background-color: #1e293b; padding: 25px; border-radius: 12px; margin: 30px 0; border: 1px solid #334155;">
                  <h3 style="color: #00FF7F; font-size: 18px; margin-top: 0; font-weight: 700;">Os teus links promocionais:</h3>

                  <p style="margin-bottom: 5px; font-size: 14px; font-weight: bold; color: #94a3b8;">LINK DE AFILIADO DIRETO:</p>
                  <div style="background-color: #0f172a; padding: 12px; border-radius: 8px; border: 1px dashed #00FF7F; font-family: monospace; font-size: 14px; word-break: break-all; color: #00FF7F; margin-bottom: 20px;">
                    ${directLink}
                  </div>

                  <p style="margin-bottom: 5px; font-size: 14px; font-weight: bold; color: #94a3b8;">LINK DE RECRUTAR SUBAFILIADOS:</p>
                  <div style="background-color: #0f172a; padding: 12px; border-radius: 8px; border: 1px dashed #60a5fa; font-family: monospace; font-size: 14px; word-break: break-all; color: #60a5fa;">
                    ${subLink}
                  </div>
                </div>

                <p style="color: #cbd5e1; line-height: 1.6; font-size: 15px; margin-top: 30px;">
                  Para entrar no painel de parceiros, usa o e-mail cadastrado e a tua palavra-passe na rota de parceiros.
                </p>
              </div>

              <!-- FOOTER -->
              <div style="background-color: #020617; padding: 25px; text-align: center; border-top: 1px solid #1e293b;">
                <p style="color: #64748b; font-size: 13px; margin: 0 0 5px 0;">
                  Dúvidas ou suporte? Entre em contacto connosco: ${supportContact}
                </p>
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Erro ao enviar email de boas-vindas do afiliado:", emailErr);
      }
    }

    const token = await signToken({
      id: newUser.id,
      email: newUser.email,
      isAffiliate: true,
      affiliateCode: newUser.affiliate_code
    });

    const response = NextResponse.json({
      success: true,
      message: "Afiliado cadastrado com sucesso!",
      user: {
        id: newUser.id,
        email: newUser.email,
        affiliateCode: newUser.affiliate_code
      }
    }, { status: 201 });

    response.cookies.set("mozbet_affiliate_session", token, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      domain: process.env.COOKIE_DOMAIN || undefined,
    });

    return response;
  } catch (error) {
    console.error("Erro no cadastro de afiliados:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
