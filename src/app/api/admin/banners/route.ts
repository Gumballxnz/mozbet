// API: Gestão de Banners do Carrossel (Admin)
// PUT /api/admin/banners — { id, image_url, badge, title, highlight, description, action_text, action_link, is_active }

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyToken } from "@/lib/auth-server";

export async function PUT(req: NextRequest) {
  try {
    // 1. Verificar autenticação
    const token = req.cookies.get("mozbet_session")?.value;
    if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const payload = await verifyToken<{ id: string; role: string }>(token);
    
    // Verificar se o utilizador é um admin no Supabase
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
      return NextResponse.json({ error: "ID do banner é obrigatório" }, { status: 400 });
    }

    // 2. Atualizar o banner
    const { error } = await supabaseAdmin
      .from("banners")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Erro BD:", error);
      return NextResponse.json({ error: "Erro ao atualizar banner" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro na atualização do banner:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
