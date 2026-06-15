import { supabaseAdmin } from "@/lib/auth-server";
import { AdminAffiliatesTable } from "@/components/admin/AdminAffiliatesTable";

export const dynamic = "force-dynamic";

export default async function AdminAffiliatesPage() {
  // 1. Buscar todos os afiliados
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, email, username, phone, created_at, is_active, affiliate_code, affiliate_name, affiliate_phone, affiliate_saque_number, affiliate_saque_method, affiliate_balance")
    .eq("is_affiliate", true)
    .order("created_at", { ascending: false });

  const affiliateIds = (users || []).map(a => a.id);

  // 2. Buscar contagem de indicados
  let referrals: any[] = [];
  if (affiliateIds.length > 0) {
    const { data } = await supabaseAdmin
      .from("users")
      .select("id, referrer_id")
      .in("referrer_id", affiliateIds);
    referrals = data || [];
  }

  // 3. Buscar todas as transações de comissão
  let txs: any[] = [];
  if (affiliateIds.length > 0) {
    const { data } = await supabaseAdmin
      .from("affiliate_transactions")
      .select("affiliate_id, type, amount")
      .in("affiliate_id", affiliateIds);
    txs = data || [];
  }

  // 4. Mapear dados com agregações ricas
  const initialAffiliates = (users || []).map(aff => {
    const myReferrals = referrals.filter(r => r.referrer_id === aff.id);
    const myTxs = txs.filter(t => t.affiliate_id === aff.id);

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
        winDeductions += amt;
      }
    });

    const totalDeposits = depositCommissions * 2;
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
      saqueNumber: aff.affiliate_saque_number || "",
      saqueMethod: aff.affiliate_saque_method || "mpesa",
      balance: aff.affiliate_balance || 0,
      referredCount: myReferrals.length,
      totalDeposits: Number(totalDeposits.toFixed(2)),
      depositCommissions: Number(depositCommissions.toFixed(2)),
      subCommissions: Number(subCommissions.toFixed(2)),
      winDeductions: Number(winDeductions.toFixed(2)),
      netEarnings
    };
  });

  return (
    <AdminAffiliatesTable initialAffiliates={initialAffiliates} />
  );
}
