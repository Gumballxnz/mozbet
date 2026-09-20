import { supabaseAdmin } from "@/lib/auth-server";

export async function registerAffiliateActivity(
  userId: string,
  type: 'DEPOSIT' | 'WIN',
  amount: number,
  referenceId?: string
) {
  try {

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("referrer_id")
      .eq("id", userId)
      .single();

    if (userError || !user || !user.referrer_id) {
      return;
    }

    const affiliateId = user.referrer_id;

    const { data: affiliate } = await supabaseAdmin
      .from("users")
      .select("parent_affiliate_id, affiliate_balance, affiliate_percent")
      .eq("id", affiliateId)
      .single();

    const affiliateRate = affiliate && affiliate.affiliate_percent !== undefined && affiliate.affiliate_percent !== null
      ? Number(affiliate.affiliate_percent) / 100
      : 0.70;

    let directCommission = 0;
    if (type === 'DEPOSIT') {
      directCommission = Number(((amount * 0.93) * affiliateRate).toFixed(2));
    } else if (type === 'WIN') {
      directCommission = -Number((amount * affiliateRate).toFixed(2));
    }

    if (directCommission === 0) return;

    const { error: txError } = await supabaseAdmin
      .from("affiliate_transactions")
      .insert({
        affiliate_id: affiliateId,
        referred_user_id: userId,
        type,
        amount: directCommission,
        reference_id: referenceId
      });

    if (txError) {
      console.error("[Affiliate Helper] Erro ao gravar transação de afiliado:", txError);
      return;
    }

    const currentBalance = Number(affiliate?.affiliate_balance || 0);
    const newBalance = Number((currentBalance + directCommission).toFixed(2));

    await supabaseAdmin
      .from("users")
      .update({ affiliate_balance: newBalance })
      .eq("id", affiliateId);

    if (affiliate && affiliate.parent_affiliate_id) {
      const parentId = affiliate.parent_affiliate_id;
      const subCommission = Number((directCommission * 0.15).toFixed(2));

      if (subCommission !== 0) {

        await supabaseAdmin
          .from("affiliate_transactions")
          .insert({
            affiliate_id: parentId,
            referred_user_id: affiliateId,
            type: "SUB_COMMISSION",
            amount: subCommission,
            reference_id: referenceId
          });

        const { data: parent } = await supabaseAdmin
          .from("users")
          .select("affiliate_balance")
          .eq("id", parentId)
          .single();

        const currentParentBalance = Number(parent?.affiliate_balance || 0);
        const newParentBalance = Number((currentParentBalance + subCommission).toFixed(2));

        await supabaseAdmin
          .from("users")
          .update({ affiliate_balance: newParentBalance })
          .eq("id", parentId);
      }
    }
  } catch (error) {
    console.error("[Affiliate Helper] Erro geral ao processar atividade de afiliados:", error);
  }
}
