import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";
import crypto from "crypto";

// Webhook da Resend — recebe notificações sobre emails enviados
// Configurado em: https://resend.com/webhooks
// URL: https://mozbet-test.vercel.app/api/webhooks/resend
// Signing Secret guardado em RESEND_WEBHOOK_SECRET

// Verificar assinatura do webhook para garantir que vem da Resend
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64");
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("resend-signature") || req.headers.get("svix-signature") || "";
    const secret = process.env.RESEND_WEBHOOK_SECRET || "";

    // Verificar assinatura (se temos o secret configurado)
    if (secret && signature) {
      const isValid = verifyWebhookSignature(rawBody, signature, secret);
      if (!isValid) {
        console.warn("[Resend Webhook] Assinatura inválida — possível ataque");
        return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);
    const { type, data } = body;

    console.log(`[Resend Webhook] Evento: ${type}`);

    // Extrair o email do destinatário
    const recipientEmail = data?.to?.[0] || data?.email || null;

    if (!recipientEmail) {
      return NextResponse.json({ received: true });
    }

    switch (type) {
      // Email rejeitado — endereço inválido ou inexistente
      case "email.bounced": {
        console.warn(`[Resend Webhook] BOUNCE detectado para: ${recipientEmail}`);

        // Marcar o email do utilizador como inválido no Supabase
        const { error } = await supabaseAdmin
          .from("users")
          .update({ email_invalid: true })
          .eq("email", recipientEmail);

        if (error) {
          console.error("Erro ao marcar email como inválido:", error);
        }
        break;
      }

      // Utilizador marcou como spam
      case "email.complained": {
        console.warn(`[Resend Webhook] COMPLAINT de: ${recipientEmail}`);

        // Desativar comunicações comerciais para este utilizador
        const { error } = await supabaseAdmin
          .from("users")
          .update({ commercial_opt_in: false })
          .eq("email", recipientEmail);

        if (error) {
          console.error("Erro ao desativar opt-in:", error);
        }
        break;
      }

      // Email entregue com sucesso
      case "email.delivered": {
        console.log(`[Resend Webhook] Email entregue a: ${recipientEmail}`);
        break;
      }

      // Atraso na entrega
      case "email.delivery_delayed": {
        console.warn(`[Resend Webhook] Atraso na entrega para: ${recipientEmail}`);
        break;
      }

      default:
        console.log(`[Resend Webhook] Evento não tratado: ${type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[Resend Webhook] Erro ao processar:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
