import { NextResponse } from "next/server";
import { supabaseAdmin, verifyToken } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    // Obter o cookie mozbet_session da requisição
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

    // 1. Obter todos os parceiros afiliados cadastrados
    const { data: affiliates, error: affError } = await supabaseAdmin
      .from("users")
      .select("id, email, username, phone, created_at, is_active, affiliate_code, affiliate_name, affiliate_phone, affiliate_saque_number, affiliate_saque_method, affiliate_saque_name, affiliate_balance")
      .eq("is_affiliate", true)
      .order("created_at", { ascending: false });

    if (affError) {
      throw affError;
    }

    if (!affiliates || affiliates.length === 0) {
      return NextResponse.json({ affiliates: [] });
    }

    const affiliateIds = affiliates.map(a => a.id);

    // 2. Buscar indicações (jogadores) vinculadas a estes parceiros
    const { data: referrals, error: refError } = await supabaseAdmin
      .from("users")
      .select("id, referrer_id")
      .in("referrer_id", affiliateIds);

    if (refError) throw refError;

    // 3. Buscar histórico de transações de comissão destes parceiros
    const { data: txs, error: txError } = await supabaseAdmin
      .from("affiliate_transactions")
      .select("affiliate_id, type, amount")
      .in("affiliate_id", affiliateIds);

    if (txError) throw txError;

    // 4. Estruturar estatísticas agregadas por afiliado
    const mappedAffiliates = affiliates.map(aff => {
      const myReferrals = referrals?.filter(r => r.referrer_id === aff.id) || [];
      const myTxs = txs?.filter(t => t.affiliate_id === aff.id) || [];

      let depositCommissions = 0;
      let subCommissions = 0;
      let winDeductions = 0;

      myTxs.forEach(t => {
        const amt = Number(t.amount);
        if (t.type === 'DEPOSIT') {
          depositCommissions += amt;
        } else if (t.type === 'SUB_COMMISSION') {
          subCommissions += amt;
        } else if (t.type === 'WIN') {
          winDeductions += amt; // WIN grava valor negativo
        }
      });

      // Depósito bruto gerado pelas indicações (comissão direta de 50% * 2)
      const totalDeposits = depositCommissions * 2;

      // Lucro líquido do parceiro (soma de comissões diretas, subcomissões e deduções negativas)
      const netEarnings = Number((depositCommissions + subCommissions + winDeductions).toFixed(2));

      return {
        id: aff.id,
        email: aff.email,
        username: aff.username,
        phone: aff.phone,
        created_at: aff.created_at,
        is_active: aff.is_active,
        code: aff.affiliate_code,
        name: aff.affiliate_name || aff.username || "Sem Nome",
        affPhone: aff.affiliate_phone || aff.phone,
        saqueNumber: aff.affiliate_saque_number,
        saqueMethod: aff.affiliate_saque_method,
        saqueName: aff.affiliate_saque_name,
        balance: aff.affiliate_balance,
        referredCount: myReferrals.length,
        totalDeposits: Number(totalDeposits.toFixed(2)),
        depositCommissions: Number(depositCommissions.toFixed(2)),
        subCommissions: Number(subCommissions.toFixed(2)),
        winDeductions: Number(winDeductions.toFixed(2)),
        netEarnings
      };
    });

    return NextResponse.json({ affiliates: mappedAffiliates });
  } catch (error: any) {
    console.error("Erro ao processar afiliados no CRM do admin:", error);
    return NextResponse.json({ error: error.message || "Erro interno do servidor" }, { status: 500 });
  }
}
