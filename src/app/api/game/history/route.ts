// API: Histórico de rondas
// GET /api/game/history?game=aviator&limit=20

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get("game") || "aviator";
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20"), 50);

  try {
    const { data: rounds, error } = await supabaseAdmin
      .from("game_history")
      .select("id, result, created_at")
      .eq("game_id", gameId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Erro no histórico (game_history):", error);
      // Fallback para a tabela antiga game_rounds caso a nova falhe ou esteja vazia no início
      const { data: oldRounds } = await supabaseAdmin
        .from("game_rounds")
        .select("id, crash_point, status, crashed_at")
        .eq("game_id", gameId)
        .eq("status", "crashed")
        .order("crashed_at", { ascending: false })
        .limit(limit);

      return NextResponse.json({
        history: (oldRounds || []).map(r => ({
          id: r.id,
          crashPoint: Number(r.crash_point),
          crashedAt: r.crashed_at,
        })),
      });
    }

    return NextResponse.json({
      history: (rounds || []).map(r => ({
        id: r.id,
        crashPoint: parseFloat(r.result.replace('x', '')),
        crashedAt: r.created_at,
      })),
    });
  } catch (error) {
    console.error("Erro no histórico:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
