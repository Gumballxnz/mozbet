import { NextResponse } from "next/server";
import { verifyToken, supabaseAdmin } from "@/lib/auth-server";
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

    // 3. Se for um jogo GLOBAL (Aviator, Earplane, Crash Global)
    const GLOBAL_GAMES = ["aviator", "earplane", "crash"];
    
    if (GLOBAL_GAMES.includes(gameId)) {
      // Buscar ronda activa 'waiting' no Supabase
      const { data: round, error: roundErr } = await supabaseAdmin
        .from("game_rounds")
        .select("id, status")
        .eq("game_id", gameId)
        .eq("status", "waiting")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (roundErr || !round) {
        return NextResponse.json({ error: "Aguarde a próxima ronda para apostar." }, { status: 400 });
      }

      // Inserir aposta na tabela 'bets'
      const { error: betErr } = await supabaseAdmin
        .from("bets")
        .insert({
          user_id: payload.id,
          round_id: round.id,
          game_id: gameId,
          amount: Number(betAmount),
          status: "active"
        });

      if (betErr) {
        console.error("Erro ao inserir aposta:", betErr);
        return NextResponse.json({ error: "Erro ao processar aposta." }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        newBalance,
        isGlobal: true,
        roundId: round.id
      });
    }

    // 4. Lógica para jogos individuais (Chicken Highway, Subway, etc)
    const wins = shouldPlayerWin(payload.id);
    let finalCrash = 1.00;
    if (wins) {
      finalCrash = Number((1.5 + Math.random() * 8.5).toFixed(2));
    } else {
      finalCrash = Number((1.00 + Math.random() * 0.40).toFixed(2));
    }

    // Criar uma "ronda privada" para este jogo individual para guardar o segredo do servidor
    const { data: round, error: roundErr } = await supabaseAdmin
      .from("game_rounds")
      .insert({
        game_id: gameId,
        status: "crashed", // Já definimos o fim
        crash_point: finalCrash,
        server_seed: crypto.randomBytes(16).toString("hex"),
      })
      .select()
      .single();

    if (roundErr) throw roundErr;

    // Criar a aposta vinculada a este segredo
    const { error: betErr } = await supabaseAdmin
      .from("bets")
      .insert({
        user_id: payload.id,
        round_id: round.id,
        game_id: gameId,
        amount: Number(betAmount),
        status: "active"
      });

    if (betErr) throw betErr;

    return NextResponse.json({
      success: true,
      newBalance,
      crashPoint: finalCrash,
      roundId: round.id,
      gameId
    });

  } catch (err: any) {
    console.error(`Erro no jogo CRASH:`, err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
