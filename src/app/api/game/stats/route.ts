// API: Dados fake e presença — para exibição no frontend
// GET /api/game/stats — dados fake de online, depósitos e retiradas
// POST /api/game/stats — heartbeat de presença

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-server";
import {
  getFakeOnlineCount,
  generateFakeDeposits,
  generateFakeWithdrawals,
  registerPresence,
  getRealOnlineCount,
} from "@/lib/game-controller";

// GET — Dados fake para exibição pública
export async function GET(req: NextRequest) {
  // Verificar se é admin para retornar dados reais
  const token = req.cookies.get("mozbet_session")?.value;
  let isAdmin = false;

  if (token) {
    const payload = await verifyToken<{ id: string; role?: string }>(token);
    if (payload?.role === "admin") {
      isAdmin = true;
    }
  }

  if (isAdmin) {
    // Admin vê dados REAIS
    return NextResponse.json({
      online: getRealOnlineCount(),
      isReal: true,
      deposits: [], // Dados reais viriam do BD
      withdrawals: [],
    });
  }

  // Jogadores normais vêm dados FAKE
  return NextResponse.json({
    online: getFakeOnlineCount(),
    isReal: false,
    deposits: generateFakeDeposits(6),
    withdrawals: generateFakeWithdrawals(6),
  });
}

// POST — Heartbeat de presença (chamado pelo frontend periodicamente)
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("mozbet_session")?.value;
    if (!token) {
      return NextResponse.json({ ok: true }); // Visitantes anónimos não contam
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
