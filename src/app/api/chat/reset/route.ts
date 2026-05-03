
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";

export async function GET() {
  try {
    const { error } = await supabaseAdmin.from("chat_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw error;

    // Injetar 5 mensagens iniciais com gíria real para não ficar vazio
    const SLANGS = [
      "Aviator hoje está a pagar mola! 🔥",
      "Quem não acredita que o Mines paga é maluco kkkk",
      "Já saquei meus 500MT, Mozbet é top 💸",
      "Alguém na escuta? Bora lucrar!",
      "Bandidos, esse voou cedo! 😤"
    ];

    for (const s of SLANGS) {
       const fakeId = Math.random().toString(36).substring(2, 6).toUpperCase();
       await supabaseAdmin.from("chat_messages").insert({
         user_id: `fake-${fakeId}`,
         username: fakeId,
         message: s,
         type: "fake_user"
       });
    }

    return NextResponse.json({ success: "Chat limpo e reiniciado com gíria real" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
