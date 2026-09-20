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

    const { sessionId } = await req.json();

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
    const { revealedCells, mineCount, minePositions } = gameData;

    if (!revealedCells || revealedCells.length === 0) {
      return NextResponse.json({ error: "Revele pelo menos uma célula antes de sacar" }, { status: 400 });
    }

    let currentMultiplier = 1.0;
    for (let i = 0; i < revealedCells.length; i++) {
      currentMultiplier *= (25 - i) / (25 - mineCount - i);
    }
    currentMultiplier = parseFloat(currentMultiplier.toFixed(2));

    const winnings = parseFloat((session.bet_amount * currentMultiplier).toFixed(2));
    const profit = parseFloat((winnings - session.bet_amount).toFixed(2));

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("balance")
      .eq("id", payload.id)
      .single();

    const currentBalance = Number(user?.balance || 0);
    const newBalance = parseFloat((currentBalance + winnings).toFixed(2));

    await supabaseAdmin
      .from("users")
      .update({ balance: newBalance })
      .eq("id", payload.id);

    try {
      const { registerAffiliateActivity } = await import("@/lib/affiliate");
      await registerAffiliateActivity(payload.id, "WIN", winnings, sessionId);
    } catch (affErr) {
      console.error("Erro ao registrar débito de afiliado no Mines:", affErr);
    }

    await supabaseAdmin
      .from("game_sessions")
      .update({
        status: "won",
        result: { multiplier: currentMultiplier, winnings, profit },
      })
      .eq("id", sessionId);

    await supabaseAdmin
      .from("bets")
      .update({
        status: "cashed_out",
        cashout_multiplier: currentMultiplier,
        profit,
      })
      .eq("round_id", sessionId)
      .eq("user_id", payload.id);

    if (profit > 100) {
      const shortId = payload.id.split("-")[0].toUpperCase();
      await supabaseAdmin.from("chat_messages").insert({
        user_id: payload.id,
        username: shortId.slice(0, 4) + "***",
        message: `Sacou ${winnings.toLocaleString("pt-BR")} MZN com ${currentMultiplier}x no Mines!`,
        type: "win_announcement",
        metadata: {
          amount: winnings,
          multiplier: currentMultiplier,
          profit,
          game_id: "mines",
          game_name: "Mines",
        },
      });
    }

    return NextResponse.json({
      winnings,
      profit,
      multiplier: currentMultiplier,
      newBalance,
      minePositions,
    });
  } catch (error) {
    console.error("Erro no cashout Mines:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
