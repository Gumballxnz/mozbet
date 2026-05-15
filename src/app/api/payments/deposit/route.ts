import { NextResponse } from "next/server";
import { verifyToken, supabaseAdmin } from "@/lib/auth-server";
import { processDebitoPayment, type DebitoPaymentMethod } from "@/lib/debitopay";
import { forceApproveDeposit } from "@/app/admin/transactions/actions";

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
    const paymentMethod: DebitoPaymentMethod = method === "emola" ? "emola" : "mpesa";

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

    const hasKeys = !!process.env.DEBITOPAY_API_KEY;
    
    // MODO SIMULAÇÃO RÁPIDO (Apenas para o teste falho de 2MT)
    if (!hasKeys && numAmount === 2) {
      await supabaseAdmin.from("transactions").update({ status: "FAILED" }).eq("id", transaction.id);
      
      await supabaseAdmin.from('notifications').insert({
        user_id: decoded.id,
        message: `Falha no depósito de ${numAmount.toFixed(2)} MZN: Saldo insuficiente no M-pesa ou PIN incorreto. Tente novamente.`,
        type: "deposit_failed"
      });
      
      return NextResponse.json({ error: "Falha simulada no M-pesa (Depósito de 2MT)." }, { status: 400 });
    }

    // Em integrações síncronas, não enviamos a notificação de 'Aguardando'
    // pois o depósito será resolvido (Sucesso ou Falha) neste mesmo request.
    
    if (hasKeys) {
      const debitopayRes = await processDebitoPayment(decoded.phone, numAmount, transaction.id, paymentMethod);
      
      if (!debitopayRes.success) {
        // Se a API deles falhar ou o cliente colocar PIN errado (síncrono)
        await supabaseAdmin
          .from("transactions")
          .update({ status: "FAILED" })
          .eq("id", transaction.id);
          
        // Notificação: Depósito Falhou
        await supabaseAdmin.from('notifications').insert({
          user_id: decoded.id,
          message: `Falha no depósito de ${numAmount.toFixed(2)} MZN: ${debitopayRes.error || "Ocorreu um erro no processamento."} Tente novamente.`,
          type: "deposit_failed"
        });
          
        return NextResponse.json({ error: debitopayRes.error }, { status: 400 });
      } else {
        const status = debitopayRes.data?.status;
        const paymentId = debitopayRes.data?.payment_id;
        
        if (paymentId) {
          await supabaseAdmin
            .from("transactions")
            .update({ provider_reference: paymentId })
            .eq("id", transaction.id);
        }
        
        // ATENÇÃO: Nunca aprovar de forma síncrona, mesmo que a DebitoPay retorne "success".
        // Isso evita a fraude de M-Pesa "confirmar sem cobrar nada".
        // O depósito ficará PENDENTE e só será aprovado quando o Webhook (callback/route.ts) for disparado.
        return NextResponse.json({ 
          success: true,
          status: "PENDING",
          message: "Verifique o seu telemóvel para confirmar o pagamento.",
          transactionId: transaction.id
        }, { status: 200 });
      }
    } else {
      // MODO SIMULAÇÃO (Enquanto esperamos chaves)
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
      message: "Verifique o seu telemóvel para confirmar o pagamento.",
      transactionId: transaction.id
    }, { status: 200 });

  } catch (error) {
    console.error("Erro na API de depósito:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
