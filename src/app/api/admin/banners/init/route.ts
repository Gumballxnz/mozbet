import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyToken } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
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

    const banners = await req.json();

    if (!Array.isArray(banners) || banners.length === 0) {
      return NextResponse.json({ error: "Lista de banners inválida" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("banners")
      .upsert(banners);

    if (error) {
      console.error("Erro BD Init:", error);
      return NextResponse.json({ error: "Erro ao inicializar banners" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro na inicialização:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
