import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("games")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Erro ao buscar jogos" }, { status: 500 });
    }

    return NextResponse.json({ games: data || [] });
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
