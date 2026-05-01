// API: Gestão de Jogos (Admin)
// PUT /api/admin/games — upsert { id, name, category, banner_url, is_hot, rtp_display, is_active, sort_order }

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyToken } from "@/lib/auth-server";

export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get("mozbet_session")?.value;
    if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const payload = await verifyToken<{ id: string; role: string }>(token);
    
    // Verificar se é admin via is_admin (booleano) na tabela users
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", payload?.id)
      .single();

    if (!user?.is_admin) {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const gameData = await req.json();

    if (!gameData.id) {
      return NextResponse.json({ error: "ID do jogo é obrigatório" }, { status: 400 });
    }

    // Upsert para funcionar tanto na primeira gravação como em atualizações
    const { error } = await supabaseAdmin
      .from("games")
      .upsert({
        id: gameData.id,
        name: gameData.name,
        banner_url: gameData.banner_url,
        category: gameData.category,
        rtp_display: gameData.rtp_display,
        is_hot: gameData.is_hot ?? false,
        is_active: gameData.is_active ?? true,
        sort_order: gameData.sort_order ?? 0,
      }, { onConflict: "id" });

    if (error) {
      console.error("Erro ao gravar jogo:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro interno games:", error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
}
