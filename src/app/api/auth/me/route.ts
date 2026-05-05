import { NextResponse } from "next/server";
import { verifyToken, supabaseAdmin } from "@/lib/auth-server";

export async function GET(req: Request) {
  try {
    // 1. Ler o cookie da requisição HTTP (invisível pro JavaScript do navegador)
    const cookieHeader = req.headers.get("cookie");
    const sessionCookie = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("mozbet_session="));
    
    const token = sessionCookie?.split("=")[1];

    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // 2. Verificar e decodificar o JWT
    const decoded = await verifyToken<{ id: string; phone: string }>(token);
    if (!decoded) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // 3. Buscar os dados mais recentes do usuário no banco (ex: saldo atualizado)
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, phone, email, balance, has_deposited, created_at, is_admin, is_active, avatar_url, vip_level, bonus_balance, unlocked_balance")
      .eq("id", decoded.id)
      .single();

    if (error || !user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // 4. Se a conta foi desativada pelo admin
    if (!user.is_active) {
      const response = NextResponse.json({ user: null }, { status: 403 });
      response.cookies.set("mozbet_session", "", { expires: new Date(0) });
      return response;
    }

    // 5. Retornar dados seguros ao frontend
    return NextResponse.json({
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
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
