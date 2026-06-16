import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyToken } from "@/lib/auth-server";

// GET: Retorna a comissão global atual (público para exibir na página de registro)
export async function GET() {
  try {
    // Buscar a comissão do primeiro afiliado como referência (ou padrão 70)
    const { data: sample } = await supabaseAdmin
      .from("users")
      .select("affiliate_percent")
      .eq("is_affiliate", true)
      .not("affiliate_percent", "is", null)
      .limit(1)
      .single();

    const currentPercent = sample?.affiliate_percent ?? 70;

    return NextResponse.json({ percent: currentPercent });
  } catch {
    return NextResponse.json({ percent: 70 });
  }
}

// POST: Atualiza a comissão de TODOS os afiliados (comissão global)
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("mozbet_session")?.value;
    if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const payload = await verifyToken<{ id: string; role: string }>(token);
    const { data: admin } = await supabaseAdmin
      .from("users")
      .select("is_admin, role")
      .eq("id", payload?.id)
      .single();

    if (!admin?.is_admin) {
      return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    }

    const { percent } = await req.json();
    const numPercent = Number(percent);

    if (isNaN(numPercent) || numPercent < 0 || numPercent > 100) {
      return NextResponse.json({ error: "A comissão deve ser entre 0% e 100%" }, { status: 400 });
    }

    // Atualizar TODOS os afiliados com a nova comissão global
    const { error, count } = await supabaseAdmin
      .from("users")
      .update({ affiliate_percent: numPercent })
      .eq("is_affiliate", true);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Comissão global alterada para ${numPercent}% em todos os afiliados!`,
      updatedCount: count
    });
  } catch (error: any) {
    console.error("Erro ao atualizar comissão global:", error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
}
