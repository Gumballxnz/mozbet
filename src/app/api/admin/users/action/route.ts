import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyToken } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("mozbet_session")?.value;
    if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const payload = await verifyToken<{ id: string; role: string }>(token);
    
    // Check if admin
    const { data: adminUser } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", payload?.id)
      .single();

    if (!adminUser?.is_admin) {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const { action, userId, balanceRetainedStatus } = await req.json();

    if (!action || !userId) {
      return NextResponse.json({ error: "Parâmetros insuficientes" }, { status: 400 });
    }

    if (action === 'delete') {
      const { error } = await supabaseAdmin.from("users").delete().eq("id", userId);
      if (error) throw error;
      return NextResponse.json({ success: true, message: "Conta apagada." });
    }

    const updates: any = {};
    if (action === 'ban') updates.is_active = false;
    if (action === 'suspend') updates.is_active = false;
    if (action === 'activate') updates.is_active = true;
    if (action === 'retain') updates.balance_retained = !balanceRetainedStatus;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabaseAdmin.from("users").update(updates).eq("id", userId);
      if (error) throw error;
      return NextResponse.json({ success: true, message: "Ação executada com sucesso." });
    }

    return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 });
  } catch (error: any) {
    console.error("Erro na ação de admin:", error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
}
