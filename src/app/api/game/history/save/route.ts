import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";

export async function POST(req: Request) {
  try {
    const { gameId, result, secret } = await req.json();

    // Verificação de segurança básica para evitar spam
    // Em produção, isso deve ser um segredo compartilhado com a VPS
    if (secret !== process.env.GAME_API_SECRET && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabaseAdmin
      .from("game_history")
      .insert([{
        game_id: gameId,
        result: String(result).includes('x') ? result : `${result}x`,
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao salvar histórico:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
