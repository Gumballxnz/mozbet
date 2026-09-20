import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin, signToken } from "@/lib/auth-server";

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_ATTEMPTS = 5;

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
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown";
    const { phone, password } = await req.json();

    if (!phone || !password) {
      return NextResponse.json({ error: "Preencha todos os campos" }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, "");

    let activeGateway = "e2payments";
    try {
      const { data: gatewaySetting } = await supabaseAdmin
        .from("settings")
        .select("value")
        .eq("key", "active_gateway")
        .single();
      if (gatewaySetting) activeGateway = gatewaySetting.value;
    } catch (err) {
      console.error("[API Login] Erro ao buscar gateway ativo:", err);
    }

    const cleanNoDdi = cleanPhone.replace(/^258/, "");
    const prefix = cleanNoDdi.substring(0, 2);
    if (activeGateway === "e2payments" && ["82", "83"].includes(prefix)) {
      return NextResponse.json(
        { error: "A rede Tmcel (mKesh) está em manutenção temporária. Por favor, utilize outra operadora ou tente mais tarde." },
        { status: 400 }
      );
    }

    const { data: isBanned } = await supabaseAdmin
      .from("banned_ips")
      .select("id")
      .eq("ip_address", ip)
      .single();

    if (isBanned) {
      return NextResponse.json({ error: "Acesso negado por segurança." }, { status: 403 });
    }

    const { data: user, error: dbError } = await supabaseAdmin
      .from("users")
      .select("id, phone, email, password_hash, balance, has_deposited, created_at, is_active, is_admin, is_suspended, failed_attempts, lockout_until, avatar_url, vip_level, bonus_balance, unlocked_balance")
      .eq("phone", cleanPhone)
      .single();

    if (dbError || !user) {

      await supabaseAdmin.from("login_attempts").insert({ ip_address: ip, identifier: cleanPhone, success: false });
      return NextResponse.json({ error: "Número ou palavra-passe incorretos." }, { status: 401 });
    }

    if (user.is_suspended) {
      return NextResponse.json({ error: "Esta conta foi suspensa por múltiplas tentativas de invasão. Contacte o suporte." }, { status: 403 });
    }

    if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
      const remainingHours = Math.ceil((new Date(user.lockout_until).getTime() - Date.now()) / (1000 * 60 * 60));
      return NextResponse.json({ error: `Muitas tentativas falhas. Tente novamente em ${remainingHours} horas.` }, { status: 403 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      const newAttempts = (user.failed_attempts || 0) + 1;
      const updateData: Record<string, unknown> = { failed_attempts: newAttempts };

      if (newAttempts >= 10) {
        updateData.is_suspended = true;
      } else if (newAttempts >= 5) {

        updateData.lockout_until = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
      }

      await supabaseAdmin.from("users").update(updateData).eq("id", user.id);
      await supabaseAdmin.from("login_attempts").insert({ ip_address: ip, identifier: cleanPhone, success: false });

      return NextResponse.json({ error: "Número ou palavra-passe incorretos." }, { status: 401 });
    }

    await supabaseAdmin.from("active_sessions").delete().lt("last_active", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const { count: sessionCount } = await supabaseAdmin
      .from("active_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((sessionCount || 0) >= 3) {
      return NextResponse.json({ error: "Limite de dispositivos atingido. Termine sessão num dos seus aparelhos." }, { status: 403 });
    }

    await supabaseAdmin.from("users").update({ failed_attempts: 0, lockout_until: null }).eq("id", user.id);
    await supabaseAdmin.from("login_attempts").insert({ ip_address: ip, identifier: cleanPhone, success: true });

    const token = await signToken({ id: user.id, phone: user.phone, isAdmin: user.is_admin });

    await supabaseAdmin.from("active_sessions").insert({
      user_id: user.id,
      session_id: token.substring(0, 50),
      ip_address: ip,
      device_info: req.headers.get("user-agent") || "unknown"
    });

    const response = NextResponse.json(
      {
        message: "Login efetuado com sucesso",
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          balance: Number(user.balance),
          hasDeposited: user.has_deposited,
          createdAt: user.created_at,
          isAdmin: user.is_admin,
          avatar: user.avatar_url || null,
          vipLevel: user.vip_level || 1,
          bonusBalance: Number(user.bonus_balance || 0),
          unlockedBalance: Number(user.unlocked_balance || 0),
        },
      },
      { status: 200 }
    );

    response.cookies.set("mozbet_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      domain: process.env.COOKIE_DOMAIN || undefined,
    });

    return response;
  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
