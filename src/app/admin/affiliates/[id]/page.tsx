import { supabaseAdmin } from "@/lib/auth-server";
import { AdminAffiliateDetails } from "@/components/admin/AdminAffiliateDetails";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth-server";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AffiliateDetailsPage({ params }: PageProps) {
  // 1. Validar se o admin atual está autenticado e tem permissões
  const cookieStore = await cookies();
  const token = cookieStore.get("mozbet_session")?.value;
  
  if (!token) {
    redirect("/admin/login");
  }

  const payload = await verifyToken<{ id: string; role: string }>(token);
  if (!payload?.id) {
    redirect("/admin/login");
  }

  // Obter role do administrador ativo
  const { data: adminUser } = await supabaseAdmin
    .from("users")
    .select("is_admin")
    .eq("id", payload.id)
    .single();

  if (!adminUser?.is_admin) {
    redirect("/");
  }

  const { id } = await params;

  // 2. Buscar dados do afiliado específico
  const { data: aff } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", id)
    .eq("is_affiliate", true)
    .single();

  if (!aff) {
    notFound();
  }

  // 3. Buscar indicados diretos
  const { data: referralsData } = await supabaseAdmin
    .from("users")
    .select("id, phone, email, balance, created_at, is_active")
    .eq("referrer_id", id)
    .order("created_at", { ascending: false });

  const referrals = referralsData || [];

  // 4. Buscar transações de comissão deste afiliado
  const { data: txsData } = await supabaseAdmin
    .from("affiliate_transactions")
    .select("type, amount")
    .eq("affiliate_id", id);

  const txs = txsData || [];

  // 5. Agregações de comissões do parceiro
  let depositCommissions = 0;
  let subCommissions = 0;
  let winDeductions = 0;
  let totalPaid = 0;

  txs.forEach(t => {
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

  // Cálculo de depósitos baseado na comissão e na taxa
  const rate = aff.affiliate_percent !== null && aff.affiliate_percent !== undefined
    ? Number(aff.affiliate_percent) / 100
    : 0.70;

  const totalDeposits = rate > 0 ? (depositCommissions / rate) / 0.93 : 0;
  const netEarnings = Number((depositCommissions + subCommissions + winDeductions).toFixed(2));

  // Extrair nome do titular se concatenado
  const rawName = aff.affiliate_name || aff.username || "Sem Nome";
  let displayName = rawName;
  let extractedSaqueName = "";
  if (rawName.includes(" | Titular: ")) {
    const parts = rawName.split(" | Titular: ");
    displayName = parts[0];
    extractedSaqueName = parts[1];
  }

  const mappedAffiliate = {
    id: aff.id,
    email: aff.email?.startsWith("aff_") ? aff.email.replace("aff_", "") : aff.email,
    username: aff.username,
    phone: aff.phone?.startsWith("aff_") ? aff.phone.replace("aff_", "") : aff.phone,
    created_at: aff.created_at,
    is_active: aff.is_active,
    code: aff.affiliate_code,
    name: displayName,
    affPhone: aff.affiliate_phone || (aff.phone?.startsWith("aff_") ? aff.phone.replace("aff_", "") : aff.phone),
    saqueNumber: aff.affiliate_saque_number || "",
    saqueMethod: aff.affiliate_saque_method || "mpesa",
    saqueName: extractedSaqueName,
    balance: aff.affiliate_balance || 0,
    referredCount: referrals.length,
    totalDeposits: Number(totalDeposits.toFixed(2)),
    depositCommissions: Number(depositCommissions.toFixed(2)),
    subCommissions: Number(subCommissions.toFixed(2)),
    winDeductions: Number(winDeductions.toFixed(2)),
    netEarnings,
    totalPaid: Number(totalPaid.toFixed(2)),
    affiliate_percent: aff.affiliate_percent
  };

  return (
    <AdminAffiliateDetails affiliate={mappedAffiliate} referrals={referrals} />
  );
}
