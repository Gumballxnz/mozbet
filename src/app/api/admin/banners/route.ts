import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyToken } from "@/lib/auth-server";

export async function PUT(req: NextRequest) {
  try {

    const token = req.cookies.get("mozbet_session")?.value;
    if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const payload = await verifyToken<{ id: string; role: string }>(token);

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", payload?.id)
      .single();

    if (!user?.is_admin) {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const { id, ...updates } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID do banner é obrigatório" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("banners")
      .upsert({
        id,
        ...updates,
        updated_at: new Date().toISOString(),
      });

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
