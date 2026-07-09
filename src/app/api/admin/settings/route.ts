import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyToken } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  try {
    // 1. Verificar autenticação
    const token = req.cookies.get("mozbet_session")?.value;
    if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const payload = await verifyToken<{ id: string; role: string }>(token);
    
    // Verificar se o utilizador é um admin no Supabase
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", payload?.id)
      .single();

    if (!user?.is_admin) {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    // 2. Buscar todas as configurações
    const { data: settings, error } = await supabaseAdmin
      .from("settings")
      .select("key, value");

    if (error) {
      console.error("Erro ao buscar configurações no BD:", error);
      return NextResponse.json({ error: "Erro ao buscar configurações" }, { status: 500 });
    }

    // Converter array para objeto chave-valor
    const configObj: Record<string, string> = {};
    if (settings) {
      settings.forEach(s => {
        configObj[s.key] = s.value;
      });
    }

    // Adicionar fallbacks para chaves obrigatórias caso não existam no BD
    if (!configObj.min_deposit) configObj.min_deposit = "10";
    if (!configObj.max_deposit) configObj.max_deposit = "17500";
    if (!configObj.first_deposit_bonus_percent) configObj.first_deposit_bonus_percent = "500";
    if (!configObj.default_deposit) configObj.default_deposit = "100";
    if (!configObj.active_gateway) configObj.active_gateway = "e2payments";

    return NextResponse.json(configObj);
  } catch (error) {
    console.error("Erro no GET de configurações:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    // 1. Verificar autenticação
    const token = req.cookies.get("mozbet_session")?.value;
    if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const payload = await verifyToken<{ id: string; role: string }>(token);
    
    // Verificar se o utilizador é um admin no Supabase
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", payload?.id)
      .single();

    if (!user?.is_admin) {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    // 2. Extrair objeto chave-valor do body
    const updates = await req.json();
    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "Formato de atualização inválido" }, { status: 400 });
    }

    // 3. Fazer o upsert de cada par chave-valor
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
      return NextResponse.json({ error: "Falha ao salvar algumas configurações" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no PUT de configurações:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
