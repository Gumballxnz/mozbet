import { NextResponse } from "next/server";
import { supabaseAdmin, verifyToken } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
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

    const { data: adminUser } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", payload.id)
      .single();

    if (!adminUser?.is_admin) {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const { data: affiliates, error: affError } = await supabaseAdmin
      .from("users")
      .select("id, email, username, phone, created_at, is_active, affiliate_code, affiliate_name, affiliate_phone, affiliate_saque_number, affiliate_saque_method, affiliate_balance")
      .eq("is_affiliate", true)
      .order("created_at", { ascending: false });

    if (affError) {
      throw affError;
    }

    if (!affiliates || affiliates.length === 0) {
      return NextResponse.json({ affiliates: [] });
    }

    const affiliateIds = affiliates.map(a => a.id);

    const { data: referrals, error: refError } = await supabaseAdmin
      .from("users")
      .select("id, referrer_id")
      .in("referrer_id", affiliateIds);

    if (refError) throw refError;

    const { data: txs, error: txError } = await supabaseAdmin
      .from("affiliate_transactions")
      .select("affiliate_id, type, amount")
      .in("affiliate_id", affiliateIds);

    if (txError) throw txError;

    const mappedAffiliates = affiliates.map(aff => {
      const myReferrals = referrals?.filter(r => r.referrer_id === aff.id) || [];
      const myTxs = txs?.filter(t => t.affiliate_id === aff.id) || [];

      let depositCommissions = 0;
      let subCommissions = 0;
      let winDeductions = 0;
      let totalPaid = 0;

      myTxs.forEach(t => {
        const amt = Number(t.amount);
        if (t.type === 'DEPOSIT') {
          depositCommissions += amt;
        } else if (t.type === 'SUB_COMMISSION') {
          subCommissions += amt;
        } else if (t.type === 'WIN') {
          winDeductions += amt;
        } else if (t.type === 'WITHDRAW') {

          const grossAmount = Math.abs(amt);
          const netAmount = grossAmount - (grossAmount >= 100 ? 20 : 0);
          totalPaid += netAmount;
        }
      });

      const totalDeposits = depositCommissions * 2;

      const netEarnings = Number((depositCommissions + subCommissions + winDeductions).toFixed(2));

        const rawName = aff.affiliate_name || aff.username || "Sem Nome";
        let displayName = rawName;
        let extractedSaqueName: string | null = null;
        if (rawName.includes(" | Titular: ")) {
          const parts = rawName.split(" | Titular: ");
          displayName = parts[0];
          extractedSaqueName = parts[1];
        }

        return {
        id: aff.id,
        email: aff.email?.startsWith("aff_") ? aff.email.replace("aff_", "") : aff.email,
        username: aff.username,
        phone: aff.phone?.startsWith("aff_") ? aff.phone.replace("aff_", "") : aff.phone,
        created_at: aff.created_at,
        is_active: aff.is_active,
        code: aff.affiliate_code,
        name: displayName,
        affPhone: aff.affiliate_phone || (aff.phone?.startsWith("aff_") ? aff.phone.replace("aff_", "") : aff.phone),
        saqueNumber: aff.affiliate_saque_number,
        saqueMethod: aff.affiliate_saque_method,
        saqueName: extractedSaqueName,
        balance: aff.affiliate_balance,
        referredCount: myReferrals.length,
        totalDeposits: Number(totalDeposits.toFixed(2)),
        depositCommissions: Number(depositCommissions.toFixed(2)),
        subCommissions: Number(subCommissions.toFixed(2)),
        winDeductions: Number(winDeductions.toFixed(2)),
        netEarnings,
        totalPaid: Number(totalPaid.toFixed(2))
      };
    });

    return NextResponse.json({ affiliates: mappedAffiliates });
  } catch (error: any) {
    console.error("Erro ao processar afiliados no CRM do admin:", error);
    return NextResponse.json({ error: error.message || "Erro interno do servidor" }, { status: 500 });
  }
}
