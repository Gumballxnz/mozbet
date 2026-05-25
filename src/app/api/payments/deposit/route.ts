import { NextResponse } from "next/server";
import { verifyToken, supabaseAdmin } from "@/lib/auth-server";
import { processE2Payment, type E2PaymentMethod } from "@/lib/e2payments";

export async function POST(req: Request) {
  try {
    // 1. Verificar se o utilizador está logado (segurança)
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

    // 2. Extrair valor, método de pagamento e validar
    const { amount, method = "mpesa" } = await req.json();
    const numAmount = Number(amount);
    const paymentMethod: E2PaymentMethod = method === "emola" ? "emola" : "mpesa";

    if (isNaN(numAmount) || numAmount < 10 || numAmount > 25000) {
      return NextResponse.json({ error: "O valor mínimo de depósito é 10 MZN." }, { status: 400 });
    }

    // 3. Criar o registo da transação como PENDENTE no Banco de Dados
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("transactions")
      .insert([
        {
          user_id: decoded.id,
          type: "DEPOSIT",
          amount: numAmount,
          status: "PENDING",
          phone: decoded.phone,
        }
      ])
      .select("id")
      .single();

    if (txError || !transaction) {
      console.error("Erro ao criar transação:", txError);
      return NextResponse.json({ error: "Erro interno ao iniciar depósito." }, { status: 500 });
    }

    const hasKeys = !!process.env.E2PAY_CLIENT_ID;
    
    // Em produção, nunca permitir o modo simulação se as chaves estiverem em falta
    if (!hasKeys && process.env.NODE_ENV === "production") {
      await supabaseAdmin.from("transactions").update({ status: "FAILED" }).eq("id", transaction.id);
      return NextResponse.json(
        { error: "Sistema de pagamento temporariamente indisponível." },
        { status: 503 }
      );
    }
    
    // MODO SIMULAÇÃO RÁPIDO (Apenas para o teste falho de 2MT em dev/testes)
    if (!hasKeys && numAmount === 2) {
      await supabaseAdmin.from("transactions").update({ status: "FAILED" }).eq("id", transaction.id);
      
      await supabaseAdmin.from('notifications').insert({
        user_id: decoded.id,
        message: `Falha no depósito de ${numAmount.toFixed(2)} MZN: Saldo insuficiente no M-pesa ou PIN incorreto. Tente novamente.`,
        type: "deposit_failed"
      });
      
      return NextResponse.json({ error: "Falha simulada no M-pesa (Depósito de 2MT)." }, { status: 400 });
    }

    if (hasKeys) {
      // ===== MODO E2PAYMENTS — PAGAMENTO INSTANTÂNEO =====
      const e2payRes = await processE2Payment(decoded.phone, numAmount, transaction.id, paymentMethod);
      
      if (!e2payRes.success) {
        // Pagamento falhou (PIN errado, saldo insuficiente, etc.)
        await supabaseAdmin
          .from("transactions")
          .update({ status: "FAILED" })
          .eq("id", transaction.id);
          
        // Notificação: Depósito Falhou
        await supabaseAdmin.from('notifications').insert({
          user_id: decoded.id,
          message: `Falha no depósito de ${numAmount.toFixed(2)} MZN: ${e2payRes.error || "Ocorreu um erro no processamento."} Tente novamente.`,
          type: "deposit_failed"
        });
          
        return NextResponse.json({ error: e2payRes.error }, { status: 400 });
      }

      // ===== PAGAMENTO APROVADO INSTANTANEAMENTE =====
      // A E2Payments confirma na hora — marcamos como COMPLETED e creditamos o saldo imediatamente
      await supabaseAdmin
        .from("transactions")
        .update({ status: "COMPLETED" })
        .eq("id", transaction.id);

      // Notificação: Depósito Concluído
      await supabaseAdmin.from('notifications').insert({
        user_id: decoded.id,
        message: `O seu depósito de ${numAmount.toFixed(2)} MZN foi aprovado com sucesso e creditado na sua conta. Boas apostas!`,
        type: "deposit_success"
      });

      // Adiciona o saldo à conta
      const { data: user } = await supabaseAdmin.from("users").select("balance, bonus_balance, has_deposited").eq("id", decoded.id).single();
      
      let newBalance = 0;
      if (user) {
        newBalance = Number(user.balance) + numAmount;
        let newBonusBalance = Number(user.bonus_balance || 0);
        let bonus = 0;
        
        // Aplica o Bónus de 500% se for o 1º depósito
        if (!user.has_deposited) {
          bonus = Math.min(numAmount * 5, 25000);
          newBonusBalance += bonus;
          
          await supabaseAdmin.from("transactions").insert([{
            user_id: decoded.id, type: "BONUS", amount: bonus, status: "COMPLETED", phone: decoded.phone
          }]);
          
          await supabaseAdmin.from('notifications').insert({
            user_id: decoded.id,
            message: `Acaba de receber ${bonus.toFixed(2)} MZN de Bónus no seu primeiro depósito!`,
            type: "promo"
          });
        }
        
        await supabaseAdmin.from("users").update({
          balance: newBalance,
          ...(bonus > 0 && { bonus_balance: newBonusBalance }),
          has_deposited: true
        }).eq("id", decoded.id);
      }

      return NextResponse.json({ 
        success: true,
        status: "COMPLETED",
        message: "Depósito concluído com sucesso!",
        newBalance,
        transactionId: transaction.id
      }, { status: 200 });

    } else {
      // ===== MODO SIMULAÇÃO (Sem chaves — Dev/Testes) =====
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Marca como completo
      await supabaseAdmin.from("transactions").update({ status: "COMPLETED" }).eq("id", transaction.id);
      
      // Notificação: Depósito Concluído
      await supabaseAdmin.from('notifications').insert({
        user_id: decoded.id,
        message: `O seu depósito de ${numAmount.toFixed(2)} MZN foi aprovado com sucesso e creditado na sua conta. Boas apostas!`,
        type: "deposit_success"
      });
      
      // Adiciona o saldo à conta
      const { data: user } = await supabaseAdmin.from("users").select("balance, has_deposited").eq("id", decoded.id).single();
      
      if (user) {
        let finalBalance = Number(user.balance) + numAmount;
        
        // Aplica o Bónus de 500% se for o 1º depósito
        if (!user.has_deposited) {
          const bonus = Math.min(numAmount * 5, 25000);
          finalBalance += bonus;
          
          await supabaseAdmin.from("transactions").insert([{
            user_id: decoded.id, type: "BONUS", amount: bonus, status: "COMPLETED", phone: decoded.phone
          }]);
          
          await supabaseAdmin.from('notifications').insert({
            user_id: decoded.id,
            message: `Acaba de receber ${bonus.toFixed(2)} MZN de Bónus no seu primeiro depósito!`,
            type: "promo"
          });
        }
        
        await supabaseAdmin.from("users").update({
          balance: finalBalance,
          has_deposited: true
        }).eq("id", decoded.id);
      }
    }

    return NextResponse.json({ 
      success: true,
      message: "Depósito concluído com sucesso!",
      transactionId: transaction.id
    }, { status: 200 });

  } catch (error) {
    console.error("Erro na API de depósito:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
