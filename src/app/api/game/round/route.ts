// API: Estado actual da ronda + criação de novas rondas
// GET /api/game/round?game=aviator — estado da ronda actual
// POST /api/game/round — criar nova ronda (só server/cron)

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";
import { generateCrashPoint, generateServerSeed, hashSeed, GAME_CONFIG } from "@/lib/game-engine";

// GET — Obter estado actual da ronda
export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get("game") || "aviator";

  try {
    // Buscar ronda activa ou mais recente
    const { data: round, error } = await supabaseAdmin
      .from("game_rounds")
      .select("id, game_id, status, crash_point, started_at, crashed_at, created_at")
      .eq("game_id", gameId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !round) {
      // Não existe ronda — criar a primeira
      const serverSeed = generateServerSeed();
      const crashPoint = generateCrashPoint();

      const { data: newRound, error: createErr } = await supabaseAdmin
        .from("game_rounds")
        .insert({
          game_id: gameId,
          server_seed: serverSeed,
          crash_point: crashPoint,
          status: "waiting",
          started_at: new Date(Date.now() + GAME_CONFIG.WAITING_TIME).toISOString(),
        })
        .select("id, game_id, status, started_at, created_at")
        .single();

      if (createErr) {
        return NextResponse.json({ error: "Erro ao criar ronda" }, { status: 500 });
      }

      return NextResponse.json({
        round: {
          id: newRound.id,
          gameId: newRound.game_id,
          status: newRound.status,
          seedHash: hashSeed(serverSeed), // Hash público para verificação
          startedAt: newRound.started_at,
        },
        config: {
          waitingTime: GAME_CONFIG.WAITING_TIME,
          tickInterval: GAME_CONFIG.TICK_INTERVAL,
          minBet: GAME_CONFIG.MIN_BET,
          maxBet: GAME_CONFIG.MAX_BET,
        },
      });
    }

    // Ronda existente
    const response: Record<string, unknown> = {
      round: {
        id: round.id,
        gameId: round.game_id,
        status: round.status,
        startedAt: round.started_at,
        crashedAt: round.crashed_at,
      },
      config: {
        waitingTime: GAME_CONFIG.WAITING_TIME,
        tickInterval: GAME_CONFIG.TICK_INTERVAL,
        minBet: GAME_CONFIG.MIN_BET,
        maxBet: GAME_CONFIG.MAX_BET,
      },
    };

    // Só revelar o crash_point APÓS a ronda terminar
    if (round.status === "crashed") {
      response.round = {
        ...(response.round as Record<string, unknown>),
        crashPoint: Number(round.crash_point),
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Erro ao buscar ronda:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST — Avançar estado da ronda (chamado pelo loop do jogo)
export async function POST(req: NextRequest) {
  try {
    const { gameId, action } = await req.json();

    if (action === "new_round") {
      const serverSeed = generateServerSeed();
      const crashPoint = generateCrashPoint();

      const { data: round, error } = await supabaseAdmin
        .from("game_rounds")
        .insert({
          game_id: gameId || "aviator",
          server_seed: serverSeed,
          crash_point: crashPoint,
          status: "waiting",
          started_at: new Date(Date.now() + GAME_CONFIG.WAITING_TIME).toISOString(),
        })
        .select("id, status, started_at")
        .single();

      if (error) {
        return NextResponse.json({ error: "Erro ao criar ronda" }, { status: 500 });
      }

      return NextResponse.json({
        roundId: round.id,
        seedHash: hashSeed(serverSeed),
        status: round.status,
      });
    }

    if (action === "start") {
      const { roundId } = await req.json();
      await supabaseAdmin
        .from("game_rounds")
        .update({ status: "running", started_at: new Date().toISOString() })
        .eq("id", roundId);

      return NextResponse.json({ status: "running" });
    }

    if (action === "crash") {
      const { roundId } = await req.json();

      // Marcar ronda como crashed
      await supabaseAdmin
        .from("game_rounds")
        .update({ status: "crashed", crashed_at: new Date().toISOString() })
        .eq("id", roundId);

      // Marcar todas as apostas sem cashout como perdidas
      await supabaseAdmin
        .from("bets")
        .update({ status: "lost" })
        .eq("round_id", roundId)
        .eq("status", "active");

      return NextResponse.json({ status: "crashed" });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    console.error("Erro na ronda:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
