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

    return NextResponse.json(
      { games: data || [] },
      {
        headers: {
          // Cache de 5 minutos no browser e CDN da Vercel
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        }
      }
    );
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
