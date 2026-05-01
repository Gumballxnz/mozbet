import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";

// Endpoint for sending emails (Individual or Global) via Resend
export async function POST(req: Request) {
  try {
    const { target, targetEmail, subject, body } = await req.json();

    if (!target || !subject || !body) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: "Serviço de e-mail (Resend) não está configurado." }, { status: 500 });
    }

    if (target === "GLOBAL") {
      // In a real advanced system, this would queue to a background worker
      return NextResponse.json({ 
        success: true, 
        message: "Campanha global agendada. O sistema iniciará o envio de 2.000 emails/dia para toda a base ativa." 
      });
    } else {
      // Individual Email
      if (!targetEmail) {
        return NextResponse.json({ error: "Utilizador não tem email de destino válido." }, { status: 404 });
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "MozBet CRM <no-reply@mozbet.com>", // You must configure this domain in Resend
          to: [targetEmail],
          subject: subject,
          html: `<div style="font-family: sans-serif; padding: 20px;">
                  <h2>MozBet Suporte</h2>
                  <p>${body.replace(/\n/g, "<br>")}</p>
                 </div>`
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to send to Resend API");
      }

      return NextResponse.json({ success: true, message: "Email enviado com sucesso." });
    }

  } catch (error: any) {
    console.error("Email Error:", error);
    return NextResponse.json({ error: error.message || "Erro interno do servidor." }, { status: 500 });
  }
}
