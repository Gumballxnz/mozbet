import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-server";
import { validateBet, deductBalance, creditBalance, shouldPlayerWin } from "@/lib/game-controller";

// Endpoint universal para jogos Instantâneos/Slots (Vitória ou Derrota instantânea)
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
    let newBalance = await deductBalance(payload.id, validation.balance!, Number(betAmount));

    // 3. O algoritmo decide se ganha ou perde
    const wins = await shouldPlayerWin(payload.id);

    let multiplier = 0;
    let winAmount = 0;

    if (wins) {
      // Se ganhou, multiplicador decente (ex: 1.5x a 5.0x para slots simples)
      multiplier = Number((1.5 + Math.random() * 3.5).toFixed(2));
      winAmount = Number((Number(betAmount) * multiplier).toFixed(2));
      
      // Creditar logo o prémio
      newBalance = await creditBalance(payload.id, winAmount);

      // Registrar comissão negativa do afiliado (50% do ganho)
      try {
        const { registerAffiliateActivity } = await import("@/lib/affiliate");
        await registerAffiliateActivity(payload.id, "WIN", winAmount, gameId);
      } catch (affErr) {
        console.error("Erro ao registrar débito de afiliado no Slot:", affErr);
      }
    }

    return NextResponse.json({
      success: true,
      newBalance,
      wins,
      multiplier,
      winAmount,
      gameId
    });

  } catch (err: any) {
    console.error(`Erro no jogo SLOT:`, err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
