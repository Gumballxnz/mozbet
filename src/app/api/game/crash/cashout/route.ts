import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-server";
import { creditBalance, deductBalance } from "@/lib/game-controller";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("cookie")?.split("mozbet_session=")[1]?.split(";")[0];
    if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const payload = await verifyToken<{ id: string }>(token);
    if (!payload?.id) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });

    const body = await req.json();
    const { betAmount, multiplier, gameId } = body;

    if (!betAmount || !multiplier || multiplier < 1.01) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // Calcula o prémio
    const winAmount = Number((Number(betAmount) * Number(multiplier)).toFixed(2));

    // Creditar o prémio na conta do utilizador
    const newBalance = await creditBalance(payload.id, winAmount);

    return NextResponse.json({
      success: true,
      newBalance,
      winAmount
    });

  } catch (err: any) {
    console.error(`Erro no CASHOUT CRASH:`, err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
