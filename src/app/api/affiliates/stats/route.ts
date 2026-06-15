import { NextResponse } from "next/server";
import { verifyToken, supabaseAdmin } from "@/lib/auth-server";

export async function GET(req: Request) {
  try {
    // 1. Ler o cookie de sessão de afiliados
    const cookieHeader = req.headers.get("cookie");
    const sessionCookie = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("mozbet_affiliate_session="));
    
    const token = sessionCookie?.split("=")[1];

    if (!token) {
      return NextResponse.json({ error: "Sessão expirada. Faça login novamente." }, { status: 401 });
    }

    // 2. Decodificar o JWT do afiliado
    const decoded = await verifyToken<{ id: string; email: string; isAffiliate: boolean }>(token);
    if (!decoded || !decoded.isAffiliate) {
      return NextResponse.json({ error: "Token inválido." }, { status: 401 });
    }

    const affiliateId = decoded.id;

    // 3. Obter os dados básicos do afiliado (saldo e código)
    const { data: affiliateUser, error: affError } = await supabaseAdmin
      .from("users")
      .select("affiliate_code, affiliate_balance, affiliate_name")
      .eq("id", affiliateId)
      .single();

    if (affError || !affiliateUser) {
      return NextResponse.json({ error: "Afiliado não encontrado." }, { status: 404 });
    }

    // 4. Buscar estatísticas em tempo real
    // Contagem de registros indicados
    const { count: totalRegistrations } = await supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", affiliateId);

    // Contagem de primeiros depósitos (has_deposited = true)
    const { count: firstDeposits } = await supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", affiliateId)
      .eq("has_deposited", true);

    // Soma das transações de comissão (Deposits, Wins, Sub-commissions)
    const { data: transactions } = await supabaseAdmin
      .from("affiliate_transactions")
      .select("amount, type");

    let totalDirectDeposits = 0;
    let totalDirectWins = 0;
    let totalSubCommission = 0;
    let totalRevenue = 0;
    let totalPaid = 0;

    // Filtrar as transações do afiliado
    const { data: myTransactions } = await supabaseAdmin
      .from("affiliate_transactions")
      .select("id, type, amount, created_at, referred_user_id, users(phone)")
      .eq("affiliate_id", affiliateId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Soma manual para calcular os agregados em tempo real
    const { data: allMyTx } = await supabaseAdmin
      .from("affiliate_transactions")
      .select("amount, type")
      .eq("affiliate_id", affiliateId);

    if (allMyTx) {
      allMyTx.forEach(tx => {
        const val = Number(tx.amount);
        if (tx.type === "DEPOSIT") {
          totalDirectDeposits += val;
          totalRevenue += val;
        } else if (tx.type === "WIN") {
          totalDirectWins += val; // vitórias são negativas na tabela
          totalRevenue += val;
        } else if (tx.type === "SUB_COMMISSION") {
          totalSubCommission += val;
          totalRevenue += val;
        } else if (tx.type === "WITHDRAW") {
          const grossAmount = Math.abs(val);
          const netAmount = grossAmount - (grossAmount >= 100 ? 20 : 0);
          totalPaid += netAmount;
        }
      });
    }

    // Contagem de subafiliados cadastrados
    const { count: totalSubAffiliates } = await supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("parent_affiliate_id", affiliateId);

    return NextResponse.json({
      success: true,
      stats: {
        name: affiliateUser.affiliate_name,
        code: affiliateUser.affiliate_code,
        balance: Number(affiliateUser.affiliate_balance || 0),
        registrations: totalRegistrations || 0,
        firstDeposits: firstDeposits || 0,
        depositsRevenue: Number(totalDirectDeposits.toFixed(2)),
        playerWinsDebit: Number(totalDirectWins.toFixed(2)),
        subAffiliateRevenue: Number(totalSubCommission.toFixed(2)),
        totalRevenue: Number(totalRevenue.toFixed(2)),
        subAffiliatesCount: totalSubAffiliates || 0,
        totalPaid: Number(totalPaid.toFixed(2))
      },
      recentTransactions: myTransactions || []
    });

  } catch (error) {
    console.error("Erro ao buscar estatísticas de afiliados:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
