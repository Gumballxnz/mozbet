// API: Histórico de rondas com detalhes das apostas
// GET /api/game/history?game=aviator&limit=20

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get("game") || "aviator";
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20"), 50);

  try {
    // 1. Buscar as rodadas da tabela game_history
    const { data: rounds, error } = await supabaseAdmin
      .from("game_history")
      .select("id, result, created_at")
      .eq("game_id", gameId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    // 2. Buscar as apostas da rodada MAIS RECENTE para a aba "Anterior"
    let lastRoundBets = [];
    if (rounds && rounds.length > 0) {
        const { data: bets } = await supabaseAdmin
            .from("bets")
            .select("user_id, amount, win_amount, cashout_multiplier")
            .eq("round_id", rounds[0].id)
            .order("amount", { ascending: false });
        
        if (bets) lastRoundBets = bets;
    }

    return NextResponse.json({
      history: (rounds || []).map((r, idx) => ({
        id: r.id,
        crashPoint: parseFloat(r.result.replace('x', '')),
        crashedAt: r.created_at,
        // Só anexa as apostas na rodada mais recente
        bets: idx === 0 ? lastRoundBets.map(b => ({
            user_id: b.user_id,
            amount: b.amount,
            win_amount: b.win_amount,
            cashed_out_at: b.cashout_multiplier
        })) : []
      })),
    });
  } catch (error) {
    console.error("Erro no histórico:", error);
    return NextResponse.json({ 
        history: [], 
        error: "Erro ao carregar dados reais" 
    }, { status: 500 });
  }
}
