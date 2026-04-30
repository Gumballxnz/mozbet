// API: Cashout — sacar ganhos antes do crash
// POST /api/game/cashout — { roundId, multiplier }

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyToken } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticação
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

    // 2. Verificar se a ronda está "running" (em andamento)
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

    // 3. Validar que o multiplicador pedido não excede o crash point
    // Isto protege contra manipulação: mesmo que alterem o valor no browser,
    // o servidor valida contra o crash_point real
    if (multiplier > Number(round.crash_point)) {
      return NextResponse.json({ error: "Tarde demais — o jogo já crashou" }, { status: 400 });
    }

    if (multiplier < 1.01) {
      return NextResponse.json({ error: "Multiplicador inválido" }, { status: 400 });
    }

    // 4. Buscar a aposta activa do utilizador nesta ronda
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

    // 5. Calcular ganhos
    const betAmount = Number(bet.amount);
    const winnings = parseFloat((betAmount * multiplier).toFixed(2));
    const profit = parseFloat((winnings - betAmount).toFixed(2));

    // 6. Actualizar aposta como sacada
    await supabaseAdmin
      .from("bets")
      .update({
        status: "cashed_out",
        cashout_multiplier: multiplier,
        profit: profit,
      })
      .eq("id", bet.id);

    // 7. Creditar saldo do utilizador
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

    // 8. Publicar vitória no chat (anúncio automático)
    if (profit > 100) { // Só anuncia vitórias acima de 100 MZN
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
