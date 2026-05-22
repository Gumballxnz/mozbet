// API: Iniciar sessão de Mines — gera minas server-side e desconta saldo
// POST /api/game/mines/start — { betAmount, mineCount }

import { NextRequest, NextResponse } from "next/server";
import { verifyToken, supabaseAdmin } from "@/lib/auth-server";
import { shouldPlayerWin, validateBet, deductBalance, registerPresence } from "@/lib/game-controller";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticação
    const token = req.cookies.get("mozbet_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Faça login para jogar" }, { status: 401 });
    }

    const payload = await verifyToken<{ id: string }>(token);
    if (!payload?.id) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    // Registar presença
    registerPresence(payload.id);

    const { betAmount, mineCount } = await req.json();

    // 2. Validar dados
    if (!mineCount || mineCount < 1 || mineCount > 24) {
      return NextResponse.json({ error: "Número de minas inválido (1-24)" }, { status: 400 });
    }

    // 3. Validar aposta e saldo
    const validation = await validateBet(payload.id, betAmount);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // 4. Descontar saldo
    const newBalance = await deductBalance(payload.id, validation.balance!, betAmount);

    // 5. Decidir se o jogador vai ganhar ou perder
    const playerWins = await shouldPlayerWin(payload.id);

    // 6. Gerar posições das minas
    const minePositions: number[] = [];

    if (!playerWins) {
      // PERDA: Colocar minas de forma mais agressiva — mais espalhadas
      // para que o jogador acerte uma mina mais cedo
      while (minePositions.length < mineCount) {
        const pos = crypto.randomBytes(1)[0] % 25;
        if (!minePositions.includes(pos)) minePositions.push(pos);
      }
    } else {
      // GANHO: Colocar minas agrupadas num canto para dar mais espaço seguro
      // Isto dá ao jogador mais chance de revelar sem acertar
      const corners = [
        [0, 1, 5, 6],    // canto superior esquerdo
        [3, 4, 8, 9],    // canto superior direito
        [15, 16, 20, 21], // canto inferior esquerdo
        [19, 18, 23, 24], // canto inferior direito
      ];
      const cornerIdx = crypto.randomBytes(1)[0] % corners.length;
      const preferredArea = corners[cornerIdx];

      // Primeiro preencher com posições do canto preferido
      for (const pos of preferredArea) {
        if (minePositions.length < mineCount) minePositions.push(pos);
      }
      // Se precisa de mais minas, adicionar aleatórias
      while (minePositions.length < mineCount) {
        const pos = crypto.randomBytes(1)[0] % 25;
        if (!minePositions.includes(pos)) minePositions.push(pos);
      }
    }

    // 7. Gerar ID de sessão único
    const sessionId = crypto.randomUUID();

    // 8. Guardar sessão no banco de dados
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
      // Reverter saldo se falhar
      await supabaseAdmin
        .from("users")
        .update({ balance: validation.balance })
        .eq("id", payload.id);
      console.error("Erro ao criar sessão:", insertErr);
      return NextResponse.json({ error: "Erro ao iniciar jogo" }, { status: 500 });
    }

    // 9. Registar aposta na tabela de bets
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
      // NÃO enviamos as posições das minas!
    });
  } catch (error) {
    console.error("Erro ao iniciar Mines:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
