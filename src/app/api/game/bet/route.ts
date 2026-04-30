// API: Colocar aposta — desconta saldo no BD
// POST /api/game/bet — { roundId, amount }

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyToken } from "@/lib/auth-server";
import { GAME_CONFIG } from "@/lib/game-engine";

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticação
    const token = req.cookies.get("mozbet_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Faça login para apostar" }, { status: 401 });
    }

    const payload = await verifyToken<{ id: string }>(token);
    if (!payload?.id) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    const { roundId, amount } = await req.json();

    // 2. Validar entrada
    if (!roundId || !amount || typeof amount !== "number") {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    if (amount < GAME_CONFIG.MIN_BET || amount > GAME_CONFIG.MAX_BET) {
      return NextResponse.json({
        error: `Aposta deve ser entre ${GAME_CONFIG.MIN_BET} e ${GAME_CONFIG.MAX_BET} MZN`
      }, { status: 400 });
    }

    // 3. Verificar se a ronda está em estado "waiting"
    const { data: round, error: roundErr } = await supabaseAdmin
      .from("game_rounds")
      .select("id, status")
      .eq("id", roundId)
      .single();

    if (roundErr || !round) {
      return NextResponse.json({ error: "Ronda não encontrada" }, { status: 404 });
    }

    if (round.status !== "waiting") {
      return NextResponse.json({ error: "Apostas encerradas para esta ronda" }, { status: 400 });
    }

    // 4. Verificar se o utilizador já apostou nesta ronda
    const { data: existingBet } = await supabaseAdmin
      .from("bets")
      .select("id")
      .eq("user_id", payload.id)
      .eq("round_id", roundId)
      .single();

    if (existingBet) {
      return NextResponse.json({ error: "Já apostou nesta ronda" }, { status: 400 });
    }

    // 5. Verificar saldo do utilizador
    const { data: user, error: userErr } = await supabaseAdmin
      .from("users")
      .select("id, balance")
      .eq("id", payload.id)
      .single();

    if (userErr || !user) {
      return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
    }

    const currentBalance = Number(user.balance);
    if (currentBalance < amount) {
      return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    }

    // 6. TRANSAÇÃO ATÓMICA: Descontar saldo + criar aposta
    const newBalance = Math.max(0, parseFloat((currentBalance - amount).toFixed(2)));

    // Descontar saldo
    const { error: balanceErr } = await supabaseAdmin
      .from("users")
      .update({ balance: newBalance })
      .eq("id", payload.id);

    if (balanceErr) {
      return NextResponse.json({ error: "Erro ao descontar saldo" }, { status: 500 });
    }

    // Criar registo da aposta
    const { data: bet, error: betErr } = await supabaseAdmin
      .from("bets")
      .insert({
        user_id: payload.id,
        round_id: roundId,
        amount: amount,
        status: "active",
      })
      .select("id, amount, status")
      .single();

    if (betErr) {
      // Reverter saldo se a aposta falhar
      await supabaseAdmin
        .from("users")
        .update({ balance: currentBalance })
        .eq("id", payload.id);
      return NextResponse.json({ error: "Erro ao registar aposta" }, { status: 500 });
    }

    return NextResponse.json({
      bet: {
        id: bet.id,
        amount: bet.amount,
        status: bet.status,
      },
      newBalance,
    });
  } catch (error) {
    console.error("Erro na aposta:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
