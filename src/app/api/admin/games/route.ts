// API: Gestão de Jogos (Admin)
// PUT /api/admin/games — { id, name, category, banner_url, is_hot, rtp_display, is_active }

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyToken } from "@/lib/auth-server";

export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get("mozbet_session")?.value;
    if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const payload = await verifyToken<{ id: string; role: string }>(token);
    
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", payload?.id)
      .single();

    if (user?.role !== "admin") {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const { id, ...updates } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID do jogo é obrigatório" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("games")
      .update({
        ...updates,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Erro ao atualizar jogo" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
