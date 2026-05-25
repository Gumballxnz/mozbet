import { NextResponse } from "next/server";
import { verifyToken, supabaseAdmin } from "@/lib/auth-server";

export async function POST(req: Request) {
  try {
    // 1. Verificar se o utilizador está logado
    const cookieHeader = req.headers.get("cookie");
    const sessionCookie = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("mozbet_session="));
    
    const token = sessionCookie?.split("=")[1];

    if (!token) {
      return NextResponse.json({ error: "Sessão expirada. Faça login novamente." }, { status: 401 });
    }

    const decoded = await verifyToken<{ id: string; phone: string; is_admin: boolean; }>(token);
    if (!decoded) {
      return NextResponse.json({ error: "Token inválido." }, { status: 401 });
    }

    // 2. Extrair valor e validar
    const { amount } = await req.json();
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount < 65) {
      return NextResponse.json({ error: "O valor mínimo de levantamento é 65 MZN." }, { status: 400 });
    }

    // 3. Buscar os dados do utilizador
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("balance")
      .eq("id", decoded.id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "Erro ao buscar dados do utilizador." }, { status: 400 });
    }

    const currentBalance = Number(user.balance);
    if (numAmount > currentBalance) {
      return NextResponse.json({ error: "Saldo real insuficiente para realizar o levantamento." }, { status: 400 });
    }

    // 4. LÓGICA DE SEGURANÇA: Verificar se o utilizador fez pelo menos 1 depósito COMPLETED hoje
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data: todayDeposits, error: depError } = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("user_id", decoded.id)
      .eq("type", "DEPOSIT")
      .eq("status", "COMPLETED")
      .gte("created_at", startOfDay.toISOString());

    if (depError) {
      console.error("Erro ao buscar depósitos de hoje:", depError);
      return NextResponse.json({ error: "Erro interno ao validar depósito de segurança." }, { status: 500 });
    }

    if (!todayDeposits || todayDeposits.length === 0) {
      // Retorna erro específico informando que o depósito de segurança é necessário
      return NextResponse.json({ error: "DEPOSIT_REQUIRED" }, { status: 403 });
    }

    // 5. Deduzir o saldo imediatamente do utilizador para congelar o valor do saque
    const newBalance = currentBalance - numAmount;
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ balance: newBalance })
      .eq("id", decoded.id);

    if (updateError) {
      console.error("Erro ao debitar saldo para saque:", updateError);
      return NextResponse.json({ error: "Erro interno ao processar débito de saldo." }, { status: 500 });
    }

    // 6. Inserir a transação de saque com status PENDING no Banco de Dados
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("transactions")
      .insert([
        {
          user_id: decoded.id,
          type: "WITHDRAW",
          amount: numAmount,
          status: "PENDING",
          phone: decoded.phone,
        }
      ])
      .select("id")
      .single();

    if (txError || !transaction) {
      console.error("Erro ao criar transação de saque:", txError);
      // Reverter o saldo debitado em caso de erro na criação da transação
      await supabaseAdmin.from("users").update({ balance: currentBalance }).eq("id", decoded.id);
      return NextResponse.json({ error: "Erro ao registrar o pedido de levantamento." }, { status: 500 });
    }

    // 7. Criar notificação para o utilizador
    await supabaseAdmin.from('notifications').insert({
      user_id: decoded.id,
      message: `O seu pedido de levantamento de ${numAmount.toFixed(2)} MZN (ID: ${transaction.id.split('-')[0]}) foi enviado e está pendente de aprovação manual.`,
      type: "promo"
    });

    return NextResponse.json({
      success: true,
      status: "PENDING",
      message: "Pedido de levantamento solicitado com sucesso!",
      newBalance,
      transactionId: transaction.id
    }, { status: 200 });

  } catch (error) {
    console.error("Erro na API de levantamento:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
