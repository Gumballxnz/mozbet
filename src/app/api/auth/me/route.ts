import { NextResponse } from "next/server";
import { verifyToken, supabaseAdmin } from "@/lib/auth-server";

export async function GET(req: Request) {
  try {

    const cookieHeader = req.headers.get("cookie");
    const sessionCookie = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("mozbet_session="));

    const token = sessionCookie?.split("=")[1];

    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const decoded = await verifyToken<{ id: string; phone: string }>(token);
    if (!decoded) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, phone, email, balance, has_deposited, created_at, is_admin, is_active, avatar_url, vip_level, bonus_balance, unlocked_balance")
      .eq("id", decoded.id)
      .single();

    if (error || !user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    if (!user.is_active) {
      const response = NextResponse.json({ user: null }, { status: 403 });
      response.cookies.set("mozbet_session", "", {
        expires: new Date(0),
        path: "/",
        domain: process.env.COOKIE_DOMAIN || undefined,
      });
      return response;
    }

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
