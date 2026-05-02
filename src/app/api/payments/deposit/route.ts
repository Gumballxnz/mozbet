import { NextResponse } from "next/server";
import { verifyToken, supabaseAdmin } from "@/lib/auth-server";
import { initiateC2BPayment } from "@/lib/e2payments";

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

    // 2. Extrair valor e validar
    const { amount } = await req.json();
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount < 1 || numAmount > 25000) {
      return NextResponse.json({ error: "Valor de depósito inválido." }, { status: 400 });
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

    // Notificação: Depósito Iniciado
    await supabaseAdmin.from('notifications').insert({
      user_id: decoded.id,
      message: `Sua solicitação de depósito de ${numAmount.toFixed(2)} MZN via telemóvel foi registrada. Aguardando confirmação.`,
      type: "deposit_pending"
    });

    const hasKeys = !!process.env.E2P_CLIENT_ID;
    
    if (hasKeys) {
      const e2pResponse = await initiateC2BPayment(decoded.phone, numAmount, transaction.id);
      
      if (!e2pResponse.success) {
        // Se a API deles falhar, cancelamos a nossa transação
        await supabaseAdmin
          .from("transactions")
          .update({ status: "FAILED" })
          .eq("id", transaction.id);
          
        // Notificação: Depósito Falhou
        await supabaseAdmin.from('notifications').insert({
          user_id: decoded.id,
          title: "Depósito Falhou",
          message: `Falha no depósito de ${numAmount.toFixed(2)} MZN: Ocorreu um erro ao processar o seu depósito. Por favor, verifique se o número de telefone e o valor inseridos estão corretos e tente novamente.`,
          type: "deposit_failed"
        });
          
        return NextResponse.json({ error: e2pResponse.error }, { status: 502 });
      }
    } else {
      // MODO SIMULAÇÃO (Enquanto esperamos chaves)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // SIMULAÇÃO DE FALHA: Se o utilizador depositar exatamente 2 MT, simula uma falha no M-pesa
      if (numAmount === 2) {
        await supabaseAdmin.from("transactions").update({ status: "FAILED" }).eq("id", transaction.id);
        
        await supabaseAdmin.from('notifications').insert({
          user_id: decoded.id,
          message: `Falha no depósito de ${numAmount.toFixed(2)} MZN: Saldo insuficiente no M-pesa ou PIN incorreto. Tente novamente.`,
          type: "deposit_failed"
        });
        
        return NextResponse.json({ error: "Falha simulada no M-pesa (Depósito de 2MT)." }, { status: 400 });
      }
      
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
