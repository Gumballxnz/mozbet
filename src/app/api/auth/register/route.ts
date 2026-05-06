import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin, signToken } from "@/lib/auth-server";
import { isValidPhone } from "@/lib/utils";

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_ATTEMPTS = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);
  if (!limit || now - limit.lastReset > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return true;
  }
  if (limit.count >= MAX_ATTEMPTS) return false;
  limit.count += 1;
  return true;
}

// FLAG: Quando tiveres saldo na MOZ SMS, muda para true para ativar verificação por SMS
const OTP_ENABLED = false;

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente em 1 minuto." },
        { status: 429 }
      );
    }
    const { phone, password } = await req.json();

    if (!phone || !password) {
      return NextResponse.json({ error: "Preencha todos os campos" }, { status: 400 });
    }

    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { error: "Número inválido. Use 9 dígitos (prefixos: 82/83/84/85/86/87/88)" },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: "A palavra-passe deve ter pelo menos 4 caracteres" },
        { status: 400 }
      );
    }

    const cleanPhone = phone.replace(/\D/g, "");

    // Verificar se o número já existe
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id, is_verified")
      .eq("phone", cleanPhone)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "Este número já se encontra registado. Faça login." },
        { status: 409 }
      );
    }

    // Hash da senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Inserir no banco de dados
    const { data: newUser, error: dbError } = await supabaseAdmin
      .from("users")
      .insert([
        {
          phone: cleanPhone,
          password_hash: hashedPassword,
          balance: 0.00,
          has_deposited: false,
          is_admin: false,
          is_verified: !OTP_ENABLED, // Se OTP está desativado, já fica verificado
        },
      ])
      .select("id, phone, balance, has_deposited, created_at, is_admin")
      .single();

    if (dbError || !newUser) {
      console.error("Erro ao inserir usuário:", dbError);
      return NextResponse.json(
        { error: "Erro ao criar conta. Tente novamente." },
        { status: 500 }
      );
    }

    // Se OTP está ativado, enviar SMS e aguardar verificação
    if (OTP_ENABLED) {
      // Importação dinâmica para não quebrar quando OTP está desativado
      const { sendSMS, generateOTP, formatOTPMessage } = await import("@/lib/mozsms");
      const code = generateOTP();

      await supabaseAdmin.from("otp_codes").insert({
        phone: cleanPhone,
        code: code,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

      await sendSMS(cleanPhone, formatOTPMessage(code));

      return NextResponse.json({
        message: "Conta criada! Verifique o código SMS enviado.",
        pendingVerification: true,
      }, { status: 201 });
    }

    // OTP desativado — login direto
    const token = await signToken({
      id: newUser.id,
      phone: newUser.phone,
      isAdmin: newUser.is_admin,
    });

    const response = NextResponse.json(
      {
        message: "Conta criada com sucesso!",
        user: {
          id: newUser.id,
          phone: newUser.phone,
          balance: Number(newUser.balance),
          hasDeposited: newUser.has_deposited,
          createdAt: newUser.created_at,
        },
      },
      { status: 201 }
    );

    response.cookies.set("mozbet_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Erro no registro:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
