
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    // Inverter para mostrar em ordem cronológica (mais antiga primeiro)
    const history = (data || []).reverse();

    return NextResponse.json({ history });
  } catch (err: any) {
    console.error("Erro ao carregar histórico do chat:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
