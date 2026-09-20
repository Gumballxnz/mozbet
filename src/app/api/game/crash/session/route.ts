import { NextResponse } from "next/server";
import { verifyToken, supabaseAdmin } from "@/lib/auth-server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get("gameId");

    const cookieHeader = req.headers.get("cookie");
    const sessionCookie = cookieHeader?.split("; ").find((row) => row.startsWith("mozbet_session="));
    const token = sessionCookie?.split("=")[1];

    if (!token || !gameId) return NextResponse.json({ session: null });

    const decoded = await verifyToken<{ id: string }>(token);
    if (!decoded) return NextResponse.json({ session: null });

    const { data: session, error } = await supabaseAdmin
      .from("game_sessions")
      .select("*")
      .eq("user_id", decoded.id)
      .eq("game_id", gameId)
      .eq("status", "active")
      .single();

    if (error || !session) {
      return NextResponse.json({ session: null });
    }

    const now = Date.now();
    const startedAt = new Date(session.created_at).getTime();
    const elapsedMs = now - startedAt;

    let currentMultiplier = 1.0;
    if (gameId === "chicken-highway" || gameId === "fishinator") {
       currentMultiplier = Math.max(1.0, 1.0 + (elapsedMs / 1000) * 0.1);
    }

    if (currentMultiplier >= session.state.crashPoint) {

    }

    return NextResponse.json({
      session: {
        id: session.id,
        betAmount: session.state.betAmount,
        targetCrash: session.state.crashPoint,
        startedAt,
        elapsedMs,
        currentMultiplier: Math.min(currentMultiplier, session.state.crashPoint)
      }
    });
  } catch (error) {
    return NextResponse.json({ session: null }, { status: 500 });
  }
}
