import { supabaseAdmin } from "@/lib/auth-server";

/**
 * Registra a atividade financeira de um usuário indicado, calculando as comissões e débitos
 * correspondentes para o afiliado padrinho e o subafiliado de nível superior (padrinho do afiliado).
 * 
 * Lógica:
 * - Depósito: Afiliado ganha +50% de comissão.
 * - Vitória em Jogo (WIN): Afiliado é penalizado em -50% do valor ganho pelo jogador (deduzido dos seus ganhos, podendo ficar negativo).
 * - Subafiliação: O padrinho do afiliado (parent_affiliate_id) recebe 15% de comissão sobre a movimentação líquida do subafiliado.
 * 
 * @param userId ID do jogador indicado que gerou a ação.
 * @param type Tipo de ação ('DEPOSIT' | 'WIN').
 * @param amount Valor bruto da transação (depósito ou vitória do jogador).
 * @param referenceId ID da transação ou aposta relacionada.
 */
export async function registerAffiliateActivity(
  userId: string,
  type: 'DEPOSIT' | 'WIN',
  amount: number,
  referenceId?: string
) {
  try {
    // 1. Buscar se o jogador possui um padrinho (referrer_id)
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("referrer_id")
      .eq("id", userId)
      .single();

    if (userError || !user || !user.referrer_id) {
      return; // Sem padrinho ou erro, nada a fazer
    }

    const affiliateId = user.referrer_id;

    // 2. Buscar dados do afiliado direto (taxa de comissão personalizada, saldo, padrinho)
    const { data: affiliate } = await supabaseAdmin
      .from("users")
      .select("parent_affiliate_id, affiliate_balance, affiliate_percent")
      .eq("id", affiliateId)
      .single();

    // Se o afiliado tiver taxa cadastrada no banco, usa ela (ex: 70% -> 0.70), senão usa o padrão de 70% (0.70)
    const affiliateRate = affiliate && affiliate.affiliate_percent !== undefined && affiliate.affiliate_percent !== null
      ? Number(affiliate.affiliate_percent) / 100
      : 0.70;

    // 3. Calcular a comissão direta do afiliado baseado na comissão dinâmica
    let directCommission = 0;
    if (type === 'DEPOSIT') {
      directCommission = Number(((amount * 0.93) * affiliateRate).toFixed(2));
    } else if (type === 'WIN') {
      directCommission = -Number((amount * affiliateRate).toFixed(2));
    }

    if (directCommission === 0) return;

    // 4. Gravar transação do afiliado direto no banco
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

    // 5. Atualizar o saldo do afiliado direto
    const currentBalance = Number(affiliate?.affiliate_balance || 0);
    const newBalance = Number((currentBalance + directCommission).toFixed(2));

    await supabaseAdmin
      .from("users")
      .update({ affiliate_balance: newBalance })
      .eq("id", affiliateId);

    // 5. Tratar subafiliação (árvore multinível de 1 nível de indicação)
    // Se o afiliado foi recrutado por outro afiliado (parent_affiliate_id), o padrinho dele ganha 15% de comissão
    if (affiliate && affiliate.parent_affiliate_id) {
      const parentId = affiliate.parent_affiliate_id;
      const subCommission = Number((directCommission * 0.15).toFixed(2));

      if (subCommission !== 0) {
        // Gravar transação indireta para o padrinho (parent)
        await supabaseAdmin
          .from("affiliate_transactions")
          .insert({
            affiliate_id: parentId,
            referred_user_id: affiliateId, // O subafiliado que gerou a comissão
            type: "SUB_COMMISSION",
            amount: subCommission,
            reference_id: referenceId
          });

        // Atualizar saldo do padrinho
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
