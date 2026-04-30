// API: Histórico do Chat
// GET /api/chat/history?limit=50

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50"), 100);

  try {
    const { data: messages, error } = await supabaseAdmin
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: "Erro ao buscar mensagens" }, { status: 500 });
    }

    // Retorna ordenado do mais antigo para o mais novo (para a UI)
    return NextResponse.json({
      messages: (messages || []).reverse(),
    });
  } catch (error) {
    console.error("Erro no histórico do chat:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
