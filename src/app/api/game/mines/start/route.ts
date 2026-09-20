import { NextRequest, NextResponse } from "next/server";
import { verifyToken, supabaseAdmin } from "@/lib/auth-server";
import { shouldPlayerWin, validateBet, deductBalance, registerPresence } from "@/lib/game-controller";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {

    const token = req.cookies.get("mozbet_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Faça login para jogar" }, { status: 401 });
    }

    const payload = await verifyToken<{ id: string }>(token);
    if (!payload?.id) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    registerPresence(payload.id);

    const { betAmount, mineCount } = await req.json();

    if (!mineCount || mineCount < 1 || mineCount > 24) {
      return NextResponse.json({ error: "Número de minas inválido (1-24)" }, { status: 400 });
    }

    const validation = await validateBet(payload.id, betAmount);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const newBalance = await deductBalance(payload.id, validation.balance!, betAmount);

    const playerWins = await shouldPlayerWin(payload.id);

    const minePositions: number[] = [];

    if (!playerWins) {

      while (minePositions.length < mineCount) {
        const pos = crypto.randomBytes(1)[0] % 25;
        if (!minePositions.includes(pos)) minePositions.push(pos);
      }
    } else {

      const corners = [
        [0, 1, 5, 6],
        [3, 4, 8, 9],
        [15, 16, 20, 21],
        [19, 18, 23, 24],
      ];
      const cornerIdx = crypto.randomBytes(1)[0] % corners.length;
      const preferredArea = corners[cornerIdx];

      for (const pos of preferredArea) {
        if (minePositions.length < mineCount) minePositions.push(pos);
      }

      while (minePositions.length < mineCount) {
        const pos = crypto.randomBytes(1)[0] % 25;
        if (!minePositions.includes(pos)) minePositions.push(pos);
      }
    }

    const sessionId = crypto.randomUUID();

    const { error: insertErr } = await supabaseAdmin
      .from("game_sessions")
      .insert({
        id: sessionId,
        user_id: payload.id,
        game_id: "mines",
        bet_amount: betAmount,
        status: "active",
        game_data: {
          mineCount,
          minePositions,
          revealedCells: [],
        },
      });

    if (insertErr) {

      await supabaseAdmin
        .from("users")
        .update({ balance: validation.balance })
        .eq("id", payload.id);
      console.error("Erro ao criar sessão:", insertErr);
      return NextResponse.json({ error: "Erro ao iniciar jogo" }, { status: 500 });
    }

    await supabaseAdmin.from("bets").insert({
      user_id: payload.id,
      round_id: sessionId,
      amount: betAmount,
      status: "active",
    });

    return NextResponse.json({
      sessionId,
      mineCount,
      newBalance,

    });
  } catch (error) {
    console.error("Erro ao iniciar Mines:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
