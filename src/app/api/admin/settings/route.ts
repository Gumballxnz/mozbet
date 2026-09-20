import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyToken } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
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

    const { data: settings, error } = await supabaseAdmin
      .from("settings")
      .select("key, value");

    let isTableMissing = false;
    if (error) {
      if (error.code === "PGRST205") {
        console.warn("[GET Settings] Tabela 'settings' não encontrada no banco, usando fallbacks.");
        isTableMissing = true;
      } else {
        console.error("Erro ao buscar configurações no BD:", error);
        return NextResponse.json({ error: "Erro ao buscar configurações" }, { status: 500 });
      }
    }

    const configObj: Record<string, string> = {};
    if (settings) {
      settings.forEach(s => {
        configObj[s.key] = s.value;
      });
    }

    if (!configObj.min_deposit) configObj.min_deposit = "10";
    if (!configObj.max_deposit) configObj.max_deposit = "17500";
    if (!configObj.first_deposit_bonus_percent) configObj.first_deposit_bonus_percent = "500";
    if (!configObj.default_deposit) configObj.default_deposit = "100";
    if (!configObj.active_gateway) configObj.active_gateway = "e2payments";
    if (!configObj.min_withdrawal) configObj.min_withdrawal = "65";
    if (!configObj.max_withdrawal_daily) configObj.max_withdrawal_daily = "25000";

    return NextResponse.json({
      ...configObj,
      _table_missing: isTableMissing
    });
  } catch (error) {
    console.error("Erro no GET de configurações:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

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

    const updates = await req.json();
    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "Formato de atualização inválido" }, { status: 400 });
    }

    const promises = Object.entries(updates).map(async ([key, value]) => {
      return supabaseAdmin
        .from("settings")
        .upsert({
          key,
          value: String(value),
          updated_at: new Date().toISOString()
        });
    });

    const results = await Promise.all(promises);
    const hasError = results.some(res => res.error);

    if (hasError) {
      console.error("Erros ao salvar configurações:", results.filter(res => res.error));
      const firstError = results.find(res => res.error)?.error;
      const isMissing = firstError?.code === "PGRST205";

      return NextResponse.json({
        error: isMissing
          ? "A tabela 'settings' não existe no banco de dados. Por favor, crie-a antes de salvar."
          : "Falha ao salvar algumas configurações"
      }, { status: isMissing ? 400 : 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no PUT de configurações:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
