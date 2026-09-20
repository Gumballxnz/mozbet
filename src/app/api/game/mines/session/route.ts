import { NextResponse } from "next/server";
import { verifyToken, supabaseAdmin } from "@/lib/auth-server";

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie");
    const sessionCookie = cookieHeader?.split("; ").find((row) => row.startsWith("mozbet_session="));
    const token = sessionCookie?.split("=")[1];

    if (!token) return NextResponse.json({ session: null });

    const decoded = await verifyToken<{ id: string }>(token);
    if (!decoded) return NextResponse.json({ session: null });

    const { data: session, error } = await supabaseAdmin
      .from("game_sessions")
      .select("*")
      .eq("user_id", decoded.id)
      .eq("game_id", "mines")
      .eq("status", "active")
      .single();

    if (error || !session) {
      return NextResponse.json({ session: null });
    }

    return NextResponse.json({
      session: {
        id: session.id,
        betAmount: session.state.betAmount,
        mineCount: session.state.mineCount,
        revealedIndices: session.state.revealedIndices || [],
        currentMultiplier: session.state.currentMultiplier || 1.0,
        potentialWin: session.state.potentialWin || 0,
      }
    });
  } catch (error) {
    return NextResponse.json({ session: null }, { status: 500 });
  }
}
