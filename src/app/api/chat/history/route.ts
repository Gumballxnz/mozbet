
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";

// Mensagens iniciais para semear o chat quando está completamente vazio
const SEED_MESSAGES = [
  { msg: "Bom dia pessoal! Quem já fez lucro hoje? 💰", id: "A8B2C4F1" },
  { msg: "Aviator tá quente, acabei de sacar x5 🔥", id: "F9D3E2A0" },
  { msg: "Mines com 3 estrelas e saí, é a estratégia certa", id: "B7C1D9F4" },
  { msg: "Primeira vez aqui, parece ser bom!", id: "E4A2B5C1" },
  { msg: "Quem joga Subway Crash? Tá a dar hoje", id: "D1F8E3A2" },
  { msg: "Acabei de depositar, bora lá! 🚀", id: "C5B4A1F9" },
  { msg: "O segredo é saber a hora de parar manos", id: "8F2D1A3B" },
  { msg: "Mandei M-Pesa e caiu na hora, sem stress", id: "3C9E4B1F" },
  { msg: "Perdi 100MT mas já recuperei 200MT no Taxi 🚕", id: "2A5B8C1D" },
  { msg: "Esse Lion Zama é viciante demais kkkk 🦁", id: "1E7F3D2A" },
];

const AVATARS = [
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=f59e0b",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&backgroundColor=10b981",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Jack&backgroundColor=3b82f6",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Molly&backgroundColor=8b5cf6",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&backgroundColor=ef4444",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe&backgroundColor=ec4899",
];

export async function GET() {
  try {
    // 1. Carregar as últimas 50 mensagens
    const { data, error } = await supabaseAdmin
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    // 2. Se o chat estiver completamente vazio, semear com mensagens iniciais
    if (!data || data.length < 5) {
      const seedData = SEED_MESSAGES.map((s, i) => ({
        user_id: `fake-${s.id}`,
        username: s.id,
        message: s.msg,
        type: "fake_user",
        avatar: AVATARS[i % AVATARS.length],
        created_at: new Date(Date.now() - (SEED_MESSAGES.length - i) * 30000).toISOString(),
      }));

      await supabaseAdmin.from("chat_messages").insert(seedData);

      // Recarregar com as mensagens semeadas
      const { data: seededData } = await supabaseAdmin
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      const history = (seededData || []).reverse();
      return NextResponse.json({ history });
    }

    // Inverter para ordem cronológica (mais antiga primeiro)
    const history = (data || []).reverse();

    return NextResponse.json({ history });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("Erro ao carregar histórico do chat:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
