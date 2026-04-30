import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";

// Webhook da Resend — recebe notificações sobre emails enviados
// Eventos: email.sent, email.delivered, email.bounced, email.complained, email.delivery_delayed
// Configurar no painel Resend: https://resend.com/webhooks
// URL do webhook: https://SEU-DOMINIO.vercel.app/api/webhooks/resend

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, data } = body;

    console.log(`[Resend Webhook] Evento: ${type}`, JSON.stringify(data, null, 2));

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
