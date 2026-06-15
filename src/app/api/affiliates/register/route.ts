import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { supabaseAdmin, signToken } from "@/lib/auth-server";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, username, password, phone, playerId, saqueMethod, saqueNumber, saqueName, subCode } = body;

    if (!name || !email || !username || !password || !phone || !saqueMethod || !saqueNumber || !saqueName) {
      return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, "");
    const cleanSaqueNumber = saqueNumber.replace(/\D/g, "");

    // 1. Verificar se o e-mail ou telefone já estão em uso
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .or(`email.eq.${email},phone.eq.${cleanPhone}`)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ error: "E-mail ou número de telefone já cadastrado no sistema." }, { status: 400 });
    }

    // 1b. Verificar se o nome de usuário (username) já está em uso
    const { data: existingUsername } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("username", username.toLowerCase().trim())
      .maybeSingle();

    if (existingUsername) {
      return NextResponse.json({ error: "Este nome de usuário já está em uso por outro parceiro." }, { status: 400 });
    }

    // 2. Determinar se há padrinho de subafiliação (parent_affiliate_id)
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

    // 3. Gerar código de afiliado único
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos únicos
    const affiliateCode = `MB${randomCode}`;

    // 4. Hash da senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Inserir novo afiliado na tabela users
    const { data: newUser, error: dbError } = await supabaseAdmin
      .from("users")
      .insert([
        {
          email: email.toLowerCase(),
          username: username.toLowerCase().trim(),
          phone: cleanPhone,
          password_hash: hashedPassword,
          is_affiliate: true,
          affiliate_code: affiliateCode,
          affiliate_name: name,
          affiliate_phone: cleanPhone,
          affiliate_saque_number: cleanSaqueNumber,
          affiliate_saque_method: saqueMethod,
          affiliate_saque_name: saqueName,
          parent_affiliate_id: parentAffiliateId,
          is_verified: true, // Já é verificado por e-mail no ato do login/cadastro
          balance: 0.00,
          affiliate_balance: 0.00
        }
      ])
      .select("id, email, affiliate_code")
      .single();

    if (dbError || !newUser) {
      console.error("Erro ao cadastrar afiliado no banco:", dbError);
      return NextResponse.json({ error: "Erro interno ao criar conta de afiliado." }, { status: 500 });
    }

    // 6. Enviar e-mail de boas-vindas contendo as AdServer URLs e dicas de comissões
    try {
      const directLink = `https://mozbet.online/redirect.aspx?pid=${affiliateCode}`;
      const subLink = `https://afiliados.mozbet.online/registar?sub=${affiliateCode}`;

      await resend.emails.send({
        from: "MozBet Afiliados <suporte@mozbet.online>",
        to: [email],
        subject: "Bem-vindo ao Programa de Afiliados MozBet! 🤝",
        html: `
          <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 30px rgba(0,0,0,0.5);">
            
            <!-- HEADER -->
            <div style="background: linear-gradient(135deg, #00FF7F 0%, #008f47 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 36px; font-weight: 900; letter-spacing: 2px; text-shadow: 0 2px 10px rgba(0,0,0,0.2);">
                MOZ<span style="color: #0f172a;">BET</span> PARTNERS
              </h1>
              <p style="color: #f0fdf4; font-size: 16px; font-weight: 500; margin: 10px 0 0 0;">
                O programa de afiliados número #1 de Moçambique!
              </p>
            </div>

            <!-- BODY -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #ffffff; font-size: 22px; margin-top: 0;">Olá, ${name}!</h2>
              <p style="color: #cbd5e1; line-height: 1.6; font-size: 15px;">
                A tua conta de parceiro foi criada com sucesso! A partir de agora, tu recebes **50% de comissão** sobre cada depósito feito pelos teus indicados. Caso eles obtenham lucros nos jogos, esse valor é deduzido proporcionalmente.
              </p>
              
              <div style="background-color: #1e293b; padding: 25px; border-radius: 12px; margin: 30px 0; border: 1px solid #334155;">
                <h3 style="color: #00FF7F; font-size: 18px; margin-top: 0; font-weight: 700;">Os teus links promocionais:</h3>
                
                <p style="margin-bottom: 5px; font-size: 14px; font-weight: bold; color: #94a3b8;">LINK DE AFILIADO DIRETO:</p>
                <div style="background-color: #0f172a; padding: 12px; border-radius: 8px; border: 1px dashed #00FF7F; font-family: monospace; font-size: 14px; word-break: break-all; color: #00FF7F; margin-bottom: 20px;">
                  ${directLink}
                </div>

                <p style="margin-bottom: 5px; font-size: 14px; font-weight: bold; color: #94a3b8;">LINK DE RECRUTAR SUBAFILIADOS (Ganha 15% das comissões deles!):</p>
                <div style="background-color: #0f172a; padding: 12px; border-radius: 8px; border: 1px dashed #60a5fa; font-family: monospace; font-size: 14px; word-break: break-all; color: #60a5fa;">
                  ${subLink}
                </div>
              </div>

              <h3 style="color: #ffffff; font-size: 18px; font-weight: 700;">Como Ganhar Dinheiro?</h3>
              <ul style="color: #cbd5e1; padding-left: 20px; line-height: 1.6; font-size: 14px;">
                <li style="margin-bottom: 10px;">Divulga o teu link direto no **YouTube, Telegram, WhatsApp, Facebook** ou outros canais.</li>
                <li style="margin-bottom: 10px;">Indica o link de subafiliados para outros influenciadores. Tu recebes **15% sobre todos os ganhos** deles de forma passiva.</li>
                <li style="margin-bottom: 10px;">Todos os teus relatórios de cliques, cadastros, depósitos e comissões são atualizados em **tempo real** no teu painel.</li>
              </ul>

              <p style="color: #cbd5e1; line-height: 1.6; font-size: 15px; margin-top: 30px;">
                Para entrar no painel de controle, usa o e-mail cadastrado e a tua palavra-passe na rota: **https://afiliados.mozbet.online/**
              </p>
            </div>

            <!-- FOOTER -->
            <div style="background-color: #020617; padding: 25px; text-align: center; border-top: 1px solid #1e293b;">
              <p style="color: #64748b; font-size: 13px; margin: 0 0 5px 0;">
                Dúvidas ou suporte? Entre em contacto connosco pelo telefone: +258 86 571 2288
              </p>
              <p style="color: #475569; font-size: 11px; margin: 0;">
                © 2026 MozBet Partners. Todos os direitos reservados.
              </p>
            </div>
          </div>
        `
      });
    } catch (mailErr) {
      console.error("Erro ao enviar e-mail de boas-vindas do afiliado:", mailErr);
    }

    // 7. Gerar Token JWT e iniciar sessão
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

    // Define o cookie de sessão de afiliados
    response.cookies.set("mozbet_affiliate_session", token, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Erro no cadastro de afiliados:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
