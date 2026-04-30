import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin, signToken } from "@/lib/auth-server";

// Sistema simples de Rate Limiting em memória (previne força bruta por IP)
// Em produção na Vercel com Edge, IPs diferentes vão para instâncias diferentes, 
// mas ainda protege contra spam local. A defesa definitiva será no Cloudflare (Fase 8).
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_ATTEMPTS = 5; // 5 tentativas por minuto

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  if (!limit) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return true;
  }

  if (now - limit.lastReset > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return true;
  }

  if (limit.count >= MAX_ATTEMPTS) {
    return false;
  }

  limit.count += 1;
  return true;
}

export async function POST(req: Request) {
  try {
    // Pegar IP real atrás de proxies/Cloudflare
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

    const cleanPhone = phone.replace(/\D/g, "");

    // 1. Buscar usuário
    const { data: user, error: dbError } = await supabaseAdmin
      .from("users")
      .select("id, phone, password_hash, balance, has_deposited, created_at, is_active, is_admin")
      .eq("phone", cleanPhone)
      .single();

    if (dbError || !user) {
      return NextResponse.json(
        { error: "Número ou palavra-passe incorretos." },
        { status: 401 }
      );
    }

    // 2. Verificar se a conta está ativa
    if (!user.is_active) {
      return NextResponse.json(
        { error: "Conta bloqueada. Contacte o suporte." },
        { status: 403 }
      );
    }

    // 3. Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Número ou palavra-passe incorretos." },
        { status: 401 }
      );
    }

    // 4. Gerar JWT
    const token = await signToken({
      id: user.id,
      phone: user.phone,
      isAdmin: user.is_admin,
    });

    // 5. Configurar o Cookie HttpOnly
    const response = NextResponse.json(
      {
        message: "Login efetuado com sucesso",
        user: {
          id: user.id,
          phone: user.phone,
          balance: Number(user.balance),
          hasDeposited: user.has_deposited,
          createdAt: user.created_at,
          isAdmin: user.is_admin,
        },
      },
      { status: 200 }
    );

    response.cookies.set("mozbet_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return response;
  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
