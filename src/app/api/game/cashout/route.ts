import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyToken } from "@/lib/auth-server";

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

    const { roundId, multiplier } = await req.json();

    if (!roundId || !multiplier || typeof multiplier !== "number") {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const { data: round, error: roundErr } = await supabaseAdmin
      .from("game_rounds")
      .select("id, status, crash_point")
      .eq("id", roundId)
      .single();

    if (roundErr || !round) {
      return NextResponse.json({ error: "Ronda não encontrada" }, { status: 404 });
    }

    if (round.status !== "running") {
      return NextResponse.json({ error: "Ronda já terminou" }, { status: 400 });
    }

    if (multiplier > Number(round.crash_point)) {
      return NextResponse.json({ error: "Tarde demais — o jogo já crashou" }, { status: 400 });
    }

    if (multiplier < 1.01) {
      return NextResponse.json({ error: "Multiplicador inválido" }, { status: 400 });
    }

    const { data: bet, error: betErr } = await supabaseAdmin
      .from("bets")
      .select("id, amount, status")
      .eq("user_id", payload.id)
      .eq("round_id", roundId)
      .eq("status", "active")
      .single();

    if (betErr || !bet) {
      return NextResponse.json({ error: "Nenhuma aposta activa nesta ronda" }, { status: 404 });
    }

    const betAmount = Number(bet.amount);
    const winnings = parseFloat((betAmount * multiplier).toFixed(2));
    const profit = parseFloat((winnings - betAmount).toFixed(2));

    await supabaseAdmin
      .from("bets")
      .update({
        status: "cashed_out",
        cashout_multiplier: multiplier,
        profit: profit,
      })
      .eq("id", bet.id);

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

    if (profit > 100) {
      await supabaseAdmin
        .from("chat_messages")
        .insert({
          user_id: payload.id,
          username: `8***${payload.id.slice(-1)}`,
          message: `Sacou ${winnings.toLocaleString("pt-BR")} MZN com ${multiplier}x!`,
          type: "win_announcement",
          metadata: {
            amount: winnings,
            multiplier,
            profit,
            roundId,
          },
        });
    }

    return NextResponse.json({
      winnings,
      profit,
      multiplier,
      newBalance,
    });
  } catch (error) {
    console.error("Erro no cashout:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
