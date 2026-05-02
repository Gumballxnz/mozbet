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
        // Buscar aposta activa do utilizador para a ronda actual
        const { data: bet, error } = await supabaseAdmin
            .from("bets")
            .select("id, amount, status, round_id")
            .eq("user_id", payload.id)
            .eq("game_id", gameId)
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
        
        return NextResponse.json({
            success: true,
            newBalance,
            winAmount
        });
    }

    // 2. Lógica para jogos individuais
    const winAmount = Number((Number(betAmount) * Number(multiplier)).toFixed(2));
    const newBalance = await creditBalance(payload.id, winAmount);

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
