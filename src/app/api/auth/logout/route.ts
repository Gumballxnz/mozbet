import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";

export async function POST(req: Request) {
  const response = NextResponse.json({ message: "Logout efetuado com sucesso" });
  
  // Pegar o token antes de apagar o cookie para remover do banco
  const cookieHeader = req.headers.get("cookie");
  const sessionCookie = cookieHeader?.split("; ").find((row) => row.startsWith("mozbet_session="));
  const token = sessionCookie?.split("=")[1];

  if (token) {
    // Remover esta sessão específica da tabela de sessões ativas
    await supabaseAdmin
      .from("active_sessions")
      .delete()
      .eq("session_id", token.substring(0, 50));
  }

  // Apaga o cookie definindo uma data expirada
  response.cookies.set("mozbet_session", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return response;
}
