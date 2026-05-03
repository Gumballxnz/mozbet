import { NextResponse } from "next/server";
import { Resend } from "resend";
import { verifyToken, supabaseAdmin } from "@/lib/auth-server";
import { generateOTP } from "@/lib/mozsms";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie");
    const sessionCookie = cookieHeader?.split("; ").find((row) => row.startsWith("mozbet_session="));
    const token = sessionCookie?.split("=")[1];

    if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const decoded = await verifyToken<{ id: string; phone: string }>(token);
    if (!decoded) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("email, phone")
      .eq("id", decoded.id)
      .single();

    if (!user?.email) {
      return NextResponse.json({ error: "Precisas de registar um e-mail primeiro para usar esta funcionalidade." }, { status: 400 });
    }

    const code = generateOTP();

    // Guardar OTP no banco
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    await supabaseAdmin.from("otp_codes").delete().eq("phone", user.email);
    await supabaseAdmin.from("otp_codes").insert({ phone: user.email, code, expires_at: expiresAt });

    // Enviar via Resend
    await resend.emails.send({
      from: "MozBet Segurança <suporte@mozbet.online>",
      to: [user.email],
      subject: "Código de Segurança - MozBet",
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; background-color: #0f172a; color: white; padding: 40px; border-radius: 20px;">
          <h1 style="color: #00FF7F; text-align: center;">Segurança MozBet</h1>
          <p>Recebemos um pedido para alterar a tua palavra-passe. Usa o código abaixo para confirmar:</p>
          <div style="background-color: #1e293b; padding: 20px; border-radius: 12px; text-align: center; margin: 30px 0; border: 1px dashed #00FF7F;">
            <span style="font-size: 32px; font-weight: bold; color: #00FF7F; letter-spacing: 5px;">${code}</span>
          </div>
          <p style="font-size: 12px; color: #64748b; text-align: center;">Se não fizeste este pedido, ignora este e-mail.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Erro ao enviar código." }, { status: 500 });
  }
}
