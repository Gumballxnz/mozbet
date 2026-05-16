import { NextResponse } from "next/server";
import crypto from "crypto";
import { forceApproveDeposit } from "@/app/admin/transactions/actions";
import { supabaseAdmin } from "@/lib/auth-server";

function verifyWebhook(rawBody: string, signature: string, secret: string) {
  try {
    const hash = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    return hash === signature;
  } catch (e) {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("x-webhook-signature");
    const secret = process.env.DEBITOPAY_WEBHOOK_SECRET;

    // --- MODO DEBUG: Gravar qualquer tentativa na base de dados para descobrirmos o que falha ---
    const rawBody = await req.text();
    
    // Tentamos fazer parse só para log
    let bodyObj = { event: "unknown", data: {} };
    try {
      bodyObj = JSON.parse(rawBody);
    } catch(e) {}

    // Vamos registrar a chegada no Supabase num "aviso" falso na tabela de notificações apenas para vermos
    if (!signature || !secret) {
      await supabaseAdmin.from("notifications").insert({
        user_id: "7219989b-986c-48be-8ab0-141de1fcfce5", // ID aleatório, não importa, ou não metemos user_id se for nullable. Se não, usamos message
        message: `WEBHOOK ERRO: Signature ou Secret em falta. Sig: ${signature ? 'Sim' : 'Não'}, Sec: ${secret ? 'Sim' : 'Não'}`,
        type: "system"
      });
      return NextResponse.json({ error: "Missing config" }, { status: 401 });
    }

    const isValid = verifyWebhook(rawBody, signature, secret);

    if (!isValid) {
      // Registrar que a assinatura falhou
      await supabaseAdmin.from("notifications").insert({
        user_id: "7219989b-986c-48be-8ab0-141de1fcfce5",
        message: `WEBHOOK REJEITADO: Assinatura inválida. Recebido: ${signature}. Evento: ${bodyObj.event}`,
        type: "system"
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = bodyObj;
    console.log("[Debito Pay Webhook] Evento Recebido:", body.event, body.data);

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
      return NextResponse.json({ success: true, warning: "Missing transaction ID" }, { status: 200 });
    }

    if (body.event === "payment.completed") {
      const res = await forceApproveDeposit(transactionId);
      if (!res.success) {
        console.error("Erro ao forçar aprovação:", res.error);
      }
    } else if (body.event === "payment.failed" || body.event === "payment.expired") {
      await supabaseAdmin.from("transactions").update({ status: "FAILED" }).eq("id", transactionId);
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error("[Debito Pay Webhook] Erro:", error);
    return NextResponse.json({ error: "Internal Server Error", msg: error.message }, { status: 500 });
  }
}
