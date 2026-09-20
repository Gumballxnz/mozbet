import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-server";
import {
  getFakeOnlineCount,
  generateFakeDeposits,
  generateFakeWithdrawals,
  registerPresence,
  getRealOnlineCount,
} from "@/lib/game-controller";

export async function GET(req: NextRequest) {

  const token = req.cookies.get("mozbet_session")?.value;
  let isAdmin = false;

  if (token) {
    const payload = await verifyToken<{ id: string; role?: string }>(token);
    if (payload?.role === "admin") {
      isAdmin = true;
    }
  }

  if (isAdmin) {

    return NextResponse.json({
      online: await getRealOnlineCount(),
      isReal: true,
      deposits: [],
      withdrawals: [],
    });
  }

  return NextResponse.json({
    online: getFakeOnlineCount(),
    isReal: false,
    deposits: generateFakeDeposits(6),
    withdrawals: generateFakeWithdrawals(6),
  });
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("mozbet_session")?.value;
    if (!token) {
      return NextResponse.json({ ok: true });
    }

    const payload = await verifyToken<{ id: string }>(token);
    if (payload?.id) {
      registerPresence(payload.id);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
