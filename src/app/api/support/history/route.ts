import { NextResponse } from "next/server";
import { supabaseAdmin, verifyToken } from "@/lib/auth-server";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("mozbet_session")?.value;

    if (!token) {
      return NextResponse.json({ messages: [] });
    }

    const payload = await verifyToken<{ id: string }>(token);
    if (!payload?.id) {
      return NextResponse.json({ messages: [] });
    }

    const { data: messages, error } = await supabaseAdmin
      .from("support_messages")
      .select("id, role, content, created_at")
      .eq("user_id", payload.id)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      console.error("[Suporte History] Erro ao buscar:", error);
      return NextResponse.json({ messages: [] });
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (error) {
    console.error("[Suporte History] Erro geral:", error);
    return NextResponse.json({ messages: [] });
  }
}
