import { NextResponse } from "next/server";
import { supabaseAdmin, verifyToken } from "@/lib/auth-server";

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookiesList = cookieHeader.split(";");
    const sessionCookie = cookiesList.find(c => c.trim().startsWith("mozbet_session="));
    const token = sessionCookie ? sessionCookie.split("=")[1] : null;

    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const payload = await verifyToken<{ id: string; role: string }>(token);
    if (!payload?.id) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    // Validar privilégios de administrador
    const { data: adminUser } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", payload.id)
      .single();

    if (!adminUser?.is_admin) {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const body = await req.json();
    const { affiliateId, amount } = body;

    if (!affiliateId || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "ID do afiliado e valor do pagamento são obrigatórios." }, { status: 400 });
    }

    const grossAmount = Number(amount);

    // Buscar saldo do afiliado para garantir que ele tem fundos
    const { data: affiliate, error: affErr } = await supabaseAdmin
      .from("users")
      .select("affiliate_balance, is_affiliate")
      .eq("id", affiliateId)
      .single();

    if (affErr || !affiliate || !affiliate.is_affiliate) {
      return NextResponse.json({ error: "Afiliado não encontrado." }, { status: 404 });
    }

    const currentBalance = Number(affiliate.affiliate_balance || 0);

    if (currentBalance < grossAmount) {
      return NextResponse.json({ error: `Saldo insuficiente. O afiliado possui apenas ${currentBalance.toFixed(2)} MZN.` }, { status: 400 });
    }

    // 1. Debitar o saldo do afiliado
    const newBalance = Number((currentBalance - grossAmount).toFixed(2));
    const { error: updateErr } = await supabaseAdmin
      .from("users")
      .update({ affiliate_balance: newBalance })
      .eq("id", affiliateId);

    if (updateErr) {
      throw updateErr;
    }

    // 2. Gravar a transação de WITHDRAW com valor negativo correspondente ao valor bruto debitado
    const { error: txErr } = await supabaseAdmin
      .from("affiliate_transactions")
      .insert({
        affiliate_id: affiliateId,
        type: "WITHDRAW",
        amount: -grossAmount,
        referred_user_id: payload.id // Vinculado ao admin que executou
      });

    if (txErr) {
      // Rollback do saldo caso a gravação da transação falhe
      await supabaseAdmin
        .from("users")
        .update({ affiliate_balance: currentBalance })
        .eq("id", affiliateId);
      throw txErr;
    }

    // Calcular taxa e valor líquido correspondente para feedback na resposta
    const hasTax = grossAmount >= 100;
    const tax = hasTax ? 20 : 0;
    const netAmount = grossAmount - tax;

    return NextResponse.json({
      success: true,
      message: `Pagamento de ${grossAmount.toFixed(2)} MZN registrado com sucesso. Valor Líquido enviado: ${netAmount.toFixed(2)} MZN (Taxa de Gateway: ${tax.toFixed(2)} MZN).`,
      newBalance
    });

  } catch (error: any) {
    console.error("Erro ao realizar payout de afiliado:", error);
    return NextResponse.json({ error: error.message || "Erro interno do servidor" }, { status: 500 });
  }
}
