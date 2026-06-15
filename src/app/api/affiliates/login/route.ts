import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin, signToken } from "@/lib/auth-server";

export async function POST(req: Request) {
  try {
    const { email, identifier, password } = await req.json();
    const loginIdentifier = (identifier || email || "").toString().trim().toLowerCase();

    if (!loginIdentifier || !password) {
      return NextResponse.json({ error: "Preencha todos os campos." }, { status: 400 });
    }

    // 1. Buscar afiliado pelo e-mail, nome de usuário ou telefone
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, email, password_hash, is_affiliate, is_active, affiliate_code")
      .or(`email.eq.${loginIdentifier},username.eq.${loginIdentifier},phone.eq.${loginIdentifier}`)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json({ error: "E-mail, usuário ou senha incorretos." }, { status: 401 });
    }

    // 2. Verificar se possui o papel de afiliado
    if (!user.is_affiliate) {
      return NextResponse.json({ error: "Esta conta não possui perfil de afiliado ativo." }, { status: 403 });
    }

    // 3. Verificar se a conta está ativa
    if (!user.is_active) {
      return NextResponse.json({ error: "Sua conta de parceiro está desativada. Contacte o suporte." }, { status: 403 });
    }

    // 4. Comparar hash da senha
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
    }

    // 5. Gerar token de sessão JWT de afiliado
    const token = await signToken({
      id: user.id,
      email: user.email,
      isAffiliate: true,
      affiliateCode: user.affiliate_code
    });

    const response = NextResponse.json({
      success: true,
      message: "Login efetuado com sucesso!",
      user: {
        id: user.id,
        email: user.email,
        affiliateCode: user.affiliate_code
      }
    });

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
    console.error("Erro no login de afiliados:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
