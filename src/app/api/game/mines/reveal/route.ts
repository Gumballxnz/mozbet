import { NextRequest, NextResponse } from "next/server";
import { verifyToken, supabaseAdmin } from "@/lib/auth-server";
import { registerPresence } from "@/lib/game-controller";

export async function POST(req: NextRequest) {
  try {

    const token = req.cookies.get("mozbet_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Faça login" }, { status: 401 });
    }

    const payload = await verifyToken<{ id: string }>(token);
    if (!payload?.id) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    registerPresence(payload.id);

    const { sessionId, cellIndex } = await req.json();

    if (cellIndex === undefined || cellIndex < 0 || cellIndex > 24) {
      return NextResponse.json({ error: "Posição inválida" }, { status: 400 });
    }

    const { data: session, error: sessionErr } = await supabaseAdmin
      .from("game_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", payload.id)
      .eq("status", "active")
      .single();

    if (sessionErr || !session) {
      return NextResponse.json({ error: "Sessão não encontrada ou já terminou" }, { status: 404 });
    }

    const gameData = session.game_data;
    const { minePositions, revealedCells, mineCount } = gameData;

    if (revealedCells.includes(cellIndex)) {
      return NextResponse.json({ error: "Célula já revelada" }, { status: 400 });
    }

    const isMine = minePositions.includes(cellIndex);

    if (isMine) {

      await supabaseAdmin
        .from("game_sessions")
        .update({
          status: "lost",
          game_data: { ...gameData, revealedCells: [...revealedCells, cellIndex] },
        })
        .eq("id", sessionId);

      await supabaseAdmin
        .from("bets")
        .update({ status: "lost" })
        .eq("round_id", sessionId)
        .eq("user_id", payload.id);

      return NextResponse.json({
        result: "mine",
        minePositions,
        cellIndex,
      });
    }

    const newRevealedCells = [...revealedCells, cellIndex];

    const totalSafe = 25 - mineCount;
    let currentMultiplier = 1.0;
    for (let i = 0; i < newRevealedCells.length; i++) {
      currentMultiplier *= (25 - i) / (25 - mineCount - i);
    }
    currentMultiplier = parseFloat(currentMultiplier.toFixed(2));

    let nextMultiplier = currentMultiplier;
    const nextIdx = newRevealedCells.length;
    if (nextIdx < totalSafe) {
      nextMultiplier = currentMultiplier * ((25 - nextIdx) / (25 - mineCount - nextIdx));
      nextMultiplier = parseFloat(nextMultiplier.toFixed(2));
    }

    const allSafeRevealed = newRevealedCells.length >= totalSafe;

    if (allSafeRevealed) {

      const winnings = parseFloat((session.bet_amount * currentMultiplier).toFixed(2));

      const { data: user } = await supabaseAdmin
        .from("users")
        .select("balance")
        .eq("id", payload.id)
        .single();
      const newBalance = parseFloat((Number(user?.balance || 0) + winnings).toFixed(2));
      await supabaseAdmin
        .from("users")
        .update({ balance: newBalance })
        .eq("id", payload.id);

      await supabaseAdmin
        .from("game_sessions")
        .update({
          status: "won",
          game_data: { ...gameData, revealedCells: newRevealedCells },
          result: { multiplier: currentMultiplier, winnings },
        })
        .eq("id", sessionId);

      await supabaseAdmin
        .from("bets")
        .update({ status: "cashed_out", cashout_multiplier: currentMultiplier, profit: winnings - session.bet_amount })
        .eq("round_id", sessionId)
        .eq("user_id", payload.id);

      return NextResponse.json({
        result: "all_clear",
        cellIndex,
        currentMultiplier,
        winnings,
        newBalance,
        minePositions,
      });
    }

    await supabaseAdmin
      .from("game_sessions")
      .update({
        game_data: { ...gameData, revealedCells: newRevealedCells },
      })
      .eq("id", sessionId);

    return NextResponse.json({
      result: "safe",
      cellIndex,
      revealedCount: newRevealedCells.length,
      currentMultiplier,
      nextMultiplier,
      potentialWin: parseFloat((session.bet_amount * currentMultiplier).toFixed(2)),
    });
  } catch (error) {
    console.error("Erro ao revelar célula:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
