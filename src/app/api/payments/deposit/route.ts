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
    // Este registo é essencial. Só vamos dar o saldo quando a e2Payments disser "PAGO".
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

    // 4. Comunicar com a e2Payments (Envia o PUSH M-Pesa pro celular)
    // Usamos o ID da transação como referência.
    // ATENÇÃO: Desativado temporariamente (simulação) até as chaves reais serem colocadas na sexta.
    
    const hasKeys = !!process.env.E2P_CLIENT_ID;
    
    if (hasKeys) {
      const e2pResponse = await initiateC2BPayment(decoded.phone, numAmount, transaction.id);
      
      if (!e2pResponse.success) {
        // Se a API deles falhar, cancelamos a nossa transação
        await supabaseAdmin
          .from("transactions")
          .update({ status: "FAILED" })
          .eq("id", transaction.id);
          
        return NextResponse.json({ error: e2pResponse.error }, { status: 502 });
      }
    } else {
      // MODO SIMULAÇÃO (Enquanto esperamos sexta-feira)
      // Como não tem chaves, vamos fingir que o pagamento demorou 2 segundos e aprovou logo o saldo.
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Marca como completo
      await supabaseAdmin.from("transactions").update({ status: "COMPLETED" }).eq("id", transaction.id);
      
      // Adiciona o saldo à conta
      const { data: user } = await supabaseAdmin.from("users").select("balance, has_deposited").eq("id", decoded.id).single();
      
      if (user) {
        let finalBalance = Number(user.balance) + numAmount;
        
        // Aplica o Bónus de 500% se for o 1º depósito (Max: 25.000 MT de Bónus)
        if (!user.has_deposited) {
          const bonus = Math.min(numAmount * 5, 25000);
          finalBalance += bonus;
          
          // Regista a transação do Bónus
          await supabaseAdmin.from("transactions").insert([{
            user_id: decoded.id, type: "BONUS", amount: bonus, status: "COMPLETED", phone: decoded.phone
          }]);
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
