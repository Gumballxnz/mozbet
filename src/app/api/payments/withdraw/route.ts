import { NextResponse } from "next/server";
import { verifyToken, supabaseAdmin } from "@/lib/auth-server";

export async function POST(req: Request) {
  try {

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

    const { amount } = await req.json();
    const numAmount = Number(amount);

    let minWithdrawal = 65;
    let maxWithdrawalDaily = 25000;
    try {
      const { data: settings } = await supabaseAdmin
        .from("settings")
        .select("key, value");

      if (settings) {
        const minSetting = settings.find(s => s.key === "min_withdrawal");
        const maxSetting = settings.find(s => s.key === "max_withdrawal_daily");
        if (minSetting) minWithdrawal = Number(minSetting.value);
        if (maxSetting) maxWithdrawalDaily = Number(maxSetting.value);
      }
    } catch (err) {
      console.error("[API Withdraw] Erro ao buscar limites do BD, usando fallbacks.");
    }

    if (isNaN(numAmount) || numAmount < minWithdrawal) {
      return NextResponse.json({ error: `O valor mínimo de levantamento é ${minWithdrawal} MZN.` }, { status: 400 });
    }

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

      return NextResponse.json({ error: "DEPOSIT_REQUIRED" }, { status: 403 });
    }

    const { data: todayWithdrawals, error: wdError } = await supabaseAdmin
      .from("transactions")
      .select("amount")
      .eq("user_id", decoded.id)
      .eq("type", "WITHDRAW")
      .in("status", ["COMPLETED", "PENDING"])
      .gte("created_at", startOfDay.toISOString());

    if (wdError) {
      console.error("Erro ao buscar saques de hoje:", wdError);
      return NextResponse.json({ error: "Erro interno ao validar limites de saque." }, { status: 500 });
    }

    const todaySum = todayWithdrawals ? todayWithdrawals.reduce((sum, tx) => sum + Number(tx.amount), 0) : 0;
    if (todaySum + numAmount > maxWithdrawalDaily) {
      return NextResponse.json({
        error: `O limite diário de levantamento é de ${maxWithdrawalDaily} MZN. Já levantou/solicitou ${todaySum} MZN hoje.`
      }, { status: 400 });
    }

    const newBalance = currentBalance - numAmount;
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ balance: newBalance })
      .eq("id", decoded.id);

    if (updateError) {
      console.error("Erro ao debitar saldo para saque:", updateError);
      return NextResponse.json({ error: "Erro interno ao processar débito de saldo." }, { status: 500 });
    }

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

      await supabaseAdmin.from("users").update({ balance: currentBalance }).eq("id", decoded.id);
      return NextResponse.json({ error: "Erro ao registrar o pedido de levantamento." }, { status: 500 });
    }

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
