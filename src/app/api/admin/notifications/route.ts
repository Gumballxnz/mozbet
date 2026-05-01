import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyToken } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticação
    const token = req.cookies.get("mozbet_session")?.value;
    if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const payload = await verifyToken<{ id: string; role: string }>(token);
    
    // Verificar se o utilizador é um admin
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", payload?.id)
      .single();

    if (!user?.is_admin) {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const { user_id, title, message } = await req.json();

    if (!title || !message) {
      return NextResponse.json({ error: "Título e mensagem obrigatórios" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('notifications').insert({ 
      user_id: user_id || null, 
      title,
      message 
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
