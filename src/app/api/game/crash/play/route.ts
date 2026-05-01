import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-server";
import { validateBet, deductBalance, creditBalance, shouldPlayerWin } from "@/lib/game-controller";

// Simula um Crash Game.
// O frontend envia a aposta e o "targetMultiplier" (auto-cashout)
export async function POST(req: Request) {
  try {
    const token = req.headers.get("cookie")?.split("mozbet_session=")[1]?.split(";")[0];
    if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const payload = await verifyToken<{ id: string }>(token);
    if (!payload?.id) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });

    const body = await req.json();
    const { betAmount, gameId } = body;

    // 1. Validar aposta
    const validation = await validateBet(payload.id, Number(betAmount));
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // 2. Descontar saldo da aposta imediatamente
    const newBalance = await deductBalance(payload.id, validation.balance!, Number(betAmount));

    // 3. O algoritmo decide se ganha ou perde
    const wins = shouldPlayerWin(payload.id);

    let finalCrash = 1.00;

    if (wins) {
      // Se ganhou, o crash é um valor aleatório decente (ex: entre 2.0x e 15.0x)
      finalCrash = Number((2.0 + Math.random() * 13.0).toFixed(2));
    } else {
      // Se perdeu, crash instantâneo ou muito baixo (ex: 1.00x a 1.20x)
      // Crash muito rápido para o jogador perder a aposta antes de reagir
      finalCrash = Number((1.00 + Math.random() * 0.20).toFixed(2));
    }

    return NextResponse.json({
      success: true,
      newBalance,
      crashPoint: finalCrash,
      gameId
    });

  } catch (err: any) {
    console.error(`Erro no jogo CRASH:`, err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
