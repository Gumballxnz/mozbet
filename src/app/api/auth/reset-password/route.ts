import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin, verifyToken } from "@/lib/auth-server";

export async function POST(req: Request) {
  try {
    const { resetToken, newPassword } = await req.json();

    if (!resetToken || !newPassword) {
      return NextResponse.json(
        { error: "Token e nova palavra-passe são obrigatórios." },
        { status: 400 }
      );
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: "A palavra-passe deve ter pelo menos 4 caracteres." },
        { status: 400 }
      );
    }

    const payload = await verifyToken(resetToken);

    if (!payload || payload.purpose !== "reset" || !payload.phone) {
      return NextResponse.json(
        { error: "Token inválido ou expirado. Solicite um novo código." },
        { status: 401 }
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ password_hash: hashedPassword })
      .eq("phone", payload.phone);

    if (updateError) {
      console.error("[RESET] Erro ao atualizar senha:", updateError);
      return NextResponse.json(
        { error: "Erro ao redefinir a palavra-passe." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Palavra-passe redefinida com sucesso! Pode iniciar sessão.",
    });
  } catch (error) {
    console.error("[RESET] Erro:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
