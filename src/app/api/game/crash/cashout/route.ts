import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-server";
import { creditBalance, deductBalance } from "@/lib/game-controller";
import { supabaseAdmin } from "@/lib/auth-server";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("cookie")?.split("mozbet_session=")[1]?.split(";")[0];
    if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const payload = await verifyToken<{ id: string }>(token);
    if (!payload?.id) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });

    const body = await req.json();
    const { betAmount, multiplier, gameId } = body;

    if (!betAmount || !multiplier || multiplier < 1.01) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // 1. Validar se for jogo GLOBAL
    const GLOBAL_GAMES = ["aviator", "earplane", "crash"];
    if (GLOBAL_GAMES.includes(gameId)) {
        // Buscar a ronda activa 'waiting' ou 'running' no Supabase para este jogo
        const { data: activeRound, error: activeRoundErr } = await supabaseAdmin
            .from("game_rounds")
            .select("id")
            .eq("game_id", gameId)
            .in("status", ["waiting", "running"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (activeRoundErr || !activeRound) {
            return NextResponse.json({ error: "Nenhuma ronda activa encontrada." }, { status: 400 });
        }

        // Buscar aposta activa do utilizador para a ronda actual
        const { data: bet, error } = await supabaseAdmin
            .from("bets")
            .select("id, amount, status, round_id")
            .eq("user_id", payload.id)
            .eq("round_id", activeRound.id)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (error || !bet) {
            return NextResponse.json({ error: "Nenhuma aposta activa encontrada." }, { status: 400 });
        }

        // Marcar como 'won'
        const winAmount = Number((Number(bet.amount) * Number(multiplier)).toFixed(2));
        await supabaseAdmin
            .from("bets")
            .update({ 
                status: "won", 
                cashout_multiplier: Number(multiplier),
                win_amount: winAmount 
            })
            .eq("id", bet.id);

        const newBalance = await creditBalance(payload.id, winAmount);

        // Registrar comissão negativa do afiliado (50% do ganho)
        try {
          const { registerAffiliateActivity } = await import("@/lib/affiliate");
          await registerAffiliateActivity(payload.id, "WIN", winAmount, bet.id);
        } catch (affErr) {
          console.error("Erro ao registrar débito de afiliado no crash global:", affErr);
        }
        
        return NextResponse.json({
            success: true,
            newBalance,
            winAmount
        });
    }

    // 2. Lógica para jogos individuais (Chicken Highway, Subway, etc)
    // Buscar apostas activas do utilizador no banco
    const { data: activeBets, error: betErr } = await supabaseAdmin
        .from("bets")
        .select("id, amount, status, round_id, game_rounds(crash_point, game_id)")
        .eq("user_id", payload.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

    if (betErr || !activeBets || activeBets.length === 0) {
        return NextResponse.json({ error: "Nenhuma aposta activa encontrada." }, { status: 400 });
    }

    // Filtrar a aposta pelo gameId atual (join game_rounds.game_id)
    const bet = activeBets.find((b: any) => b.game_rounds?.game_id === gameId);

    if (!bet) {
        return NextResponse.json({ error: "Nenhuma aposta activa encontrada." }, { status: 400 });
    }

    const serverCrashPoint = (bet.game_rounds as any).crash_point;
    
    // VALIDACÃO CRÍTICA: O utilizador não pode levantar mais do que o servidor definiu
    if (Number(multiplier) > serverCrashPoint) {
        // Se o utilizador tentar burlar enviando um multiplicador maior que o crash real,
        // ele perde a aposta imediatamente.
        await supabaseAdmin.from("bets").update({ status: "lost" }).eq("id", bet.id);
        return NextResponse.json({ error: "Tentativa de fraude detectada. Aposta perdida." }, { status: 400 });
    }

    const winAmount = Number((Number(bet.amount) * Number(multiplier)).toFixed(2));
    
    // Marcar como ganha
    await supabaseAdmin
        .from("bets")
        .update({ 
            status: "won", 
            cashout_multiplier: Number(multiplier),
            win_amount: winAmount 
        })
        .eq("id", bet.id);

    const newBalance = await creditBalance(payload.id, winAmount);

    // Registrar comissão negativa do afiliado (50% do ganho)
    try {
      const { registerAffiliateActivity } = await import("@/lib/affiliate");
      await registerAffiliateActivity(payload.id, "WIN", winAmount, bet.id);
    } catch (affErr) {
      console.error("Erro ao registrar débito de afiliado no crash individual:", affErr);
    }

    return NextResponse.json({
      success: true,
      newBalance,
      winAmount
    });

  } catch (err: any) {
    console.error(`Erro no CASHOUT CRASH:`, err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
