import { NextResponse } from "next/server";
import crypto from "crypto";
import { forceApproveDeposit } from "@/app/admin/transactions/actions";
import { supabaseAdmin } from "@/lib/auth-server";

// Função para validar a assinatura do webhook HMAC-SHA256
function verifyWebhook(rawBody: string, signature: string, secret: string) {
  const hash = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return hash === signature;
}

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("x-webhook-signature");
    const secret = process.env.DEBITOPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.error("[Debito Pay Webhook] Secret não configurado (DEBITOPAY_WEBHOOK_SECRET).");
      return NextResponse.json({ error: "Webhook secret missing" }, { status: 500 });
    }

    if (!signature) {
      return NextResponse.json({ error: "Signature missing" }, { status: 401 });
    }

    // O corpo do pedido é usado cru (raw string) para a validação SHA256
    const rawBody = await req.text();
    const isValid = verifyWebhook(rawBody, signature, secret);

    if (!isValid) {
      console.error("[Debito Pay Webhook] Assinatura inválida.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    console.log("[Debito Pay Webhook] Evento Recebido:", body.event, body.data);

    // O webhook agora busca a transação pelo reference que guardamos
    const paymentId = body.data?.payment_id;
    let transactionId = body.data?.source_id || body.data?.reference;

    if (paymentId) {
      const { data: tx } = await supabaseAdmin
        .from("transactions")
        .select("id")
        .eq("reference", paymentId)
        .single();
      
      if (tx) {
        transactionId = tx.id;
      }
    }

    if (!transactionId) {
      console.error("[Debito Pay Webhook] ID de transação ausente no payload.");
      return NextResponse.json({ success: true, warning: "Missing transaction ID" }, { status: 200 });
    }

    if (body.event === "payment.completed") {
      // Aprovar o depósito no nosso sistema (bónus, saldo, notificações)
      const res = await forceApproveDeposit(transactionId);
      if (!res.success) {
        console.error("[Debito Pay Webhook] Erro ao forçar aprovação:", res.error);
      } else {
        console.log(`[Debito Pay Webhook] Depósito ${transactionId} aprovado com sucesso!`);
      }
    } else if (body.event === "payment.failed" || body.event === "payment.expired") {
      // Marcar como falha
      await supabaseAdmin.from("transactions").update({ status: "FAILED" }).eq("id", transactionId);
      console.log(`[Debito Pay Webhook] Depósito ${transactionId} falhou.`);
    }

    // Importante responder 200 num webhook
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("[Debito Pay Webhook] Erro ao processar:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
