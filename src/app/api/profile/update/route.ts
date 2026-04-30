import { NextResponse } from "next/server";
import { Resend } from "resend";
import { verifyToken, supabaseAdmin } from "@/lib/auth-server";

// Inicializa a Resend com a Chave de API
const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie");
    const sessionCookie = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("mozbet_session="));
    const token = sessionCookie?.split("=")[1];

    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const decoded = await verifyToken<{ id: string; phone: string }>(token);
    if (!decoded) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const { email, commercialOptIn, avatar } = await req.json();

    // 1. Atualizar base de dados
    const updateData: any = {};
    if (email !== undefined) updateData.email = email;
    if (commercialOptIn !== undefined) updateData.commercial_opt_in = commercialOptIn;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabaseAdmin
        .from("users")
        .update(updateData)
        .eq("id", decoded.id);

      if (error) throw error;
    }

    // 2. Enviar email de boas-vindas com a Resend (se for um email novo e válido)
    if (email && email.includes("@")) {
      try {
        await resend.emails.send({
          from: "MozBet Suporte <onboarding@resend.dev>", // Usando sandbox do resend free
          to: [email],
          subject: "Bem-vindo à MozBet - Confirmação de E-mail",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #111; color: #fff; padding: 20px; border-radius: 10px;">
              <h1 style="color: #00FF7F; text-align: center;">MOZBET</h1>
              <p>Olá jogador,</p>
              <p>Obrigado por atualizares o teu perfil e adicionares o teu email à nossa plataforma.</p>
              ${commercialOptIn ? '<p>Ficamos felizes por aceitares receber as nossas novidades! Fica atento aos <strong>Bónus Exclusivos</strong> e <strong>Torneios</strong>.</p>' : ''}
              <p>O teu ID de Segurança: <strong>${decoded.id.split('-')[0].toUpperCase()}</strong></p>
              <br/>
              <p>Boa sorte nas apostas!</p>
              <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">Equipa MozBet</p>
            </div>
          `,
        });
        console.log("Email enviado com sucesso via Resend para", email);
      } catch (emailError) {
        console.error("Erro ao enviar email pela Resend:", emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Erro no update do perfil:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
