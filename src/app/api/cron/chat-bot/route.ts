import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";

// ===== PROTECÇÃO: Apenas Vercel Cron pode chamar =====
const CRON_SECRET = process.env.CRON_SECRET || "mozbet-cron-2026";

// ===== POOL DE MENSAGENS FAKE (Calão Moçambicano) =====
const FAKE_MESSAGES = [
  "Este Aviator só me come o mola, fds! 😤",
  "Saquei 500MT agora, o motor tá quente 🔥",
  "Alguém aí já ganhou hoje?",
  "Aviator voou cedo demais, bandidos!",
  "Mines é pra quem tem coração kkkk",
  "Mozbet pagou! M-Pesa cantou 💸",
  "Parem de chorar e apostem com cabeça",
  "Esse gajo só ganha, deve ser feitiço 😂",
  "Mines me deu 200MT, vou fugir antes que me comam",
  "Aviator tá a pagar muito hoje, aproveitem!",
  "Quem não arrisca não petisca, bora lá!",
  "Já fiz meu dia no Subway Crash, tchau!",
  "Tô a espera do meu saque, Mozbet não falha",
  "Fiz 1000MT com 50MT, jantar por minha conta 🍗",
  "Alguém tem estratégia pro Earplane?",
  "Perdi 200MT mas recuperei 300MT no Taxi 🚕🔥",
  "Mines 3 estrelas e BOOM 💥 perdi tudo",
  "Subway Crash pagou x8! Quem apanhou?",
  "Bora pessoal, aposta mínima e lucro máximo",
  "Acabei de sacar, obrigado Mozbet 🙏",
  "Lion Zama tá generoso hoje",
  "x25 no Aviator! Incrível!",
  "Chicken Highway me deu 3 vidas seguidas 😍",
  "Cuidado, o Crash tá a rebentar cedo",
  "Mega Fruits me deu jackpot 🍒🍒🍒",
  "Fishinator é bom pra quem tem paciência",
  "Alguém mais no Football X? Tá a dar!",
  "Plinko777 me deu x50 na bola dourada!",
  "Só mais uma aposta... disse eu há 2 horas 😅",
  "Esse site é legítimo, já saquei 5 vezes",
  "Augustus Crash x12! Quase morri ❤️",
  "Bom dia! Quem já fez lucro?",
  "Boa noite rapaziada! 🌙",
  "Bottle Mania é viciante kkkk",
  "Entrei com 100MT e já tenho 450MT 📈",
  "Purple Crash me destruiu 😭😭",
  "Eu sou do Aviator, vocês?",
  "Ganhei 2000MT no Lion Zama! 🦁🔥",
  "Chat animado hoje hein kkk",
  "O segredo é saber a hora de parar",
  "Tô a jogar desde manhã e já tripliquei",
  "Mandei M-Pesa e caiu na hora ⚡",
  "Quem joga Mines, x1.5 e sai, melhor estratégia",
  "Esse Earplane tá maneiro demais",
  "Já são 3 da manhã e eu aqui kkkk",
  "Vou dormir agora, amanhã volto com tudo 💪",
];

// ===== MENSAGENS DE SISTEMA =====
const SYSTEM_MESSAGES = [
  { title: "🎁 Bónus Hora Feliz", message: "Depósitos nos próximos 30 min ganham 10% extra!" },
  { title: "🔥 Torneio Aviator", message: "Torneio às 21h com prémio de 5.000 MZN!" },
  { title: "💰 Chuva de Bónus", message: "Os 10 primeiros a depositar recebem 50 MZN grátis!" },
  { title: "🎰 Jogo em Alta", message: "O Lion Zama está ON FIRE! Já experimentaste?" },
  { title: "🏆 Vencedor do Dia", message: "Um jogador ganhou mais de 10.000 MZN! Serás tu?" },
  { title: "⚡ Multiplicadores Altos", message: "O Aviator atingiu x45 nesta última hora!" },
  { title: "📱 Joga pelo Telemóvel", message: "A melhor experiência MozBet é no Chrome mobile!" },
  { title: "🛡️ Jogo Responsável", message: "Define os teus limites. A MozBet apoia o jogo responsável." },
  { title: "💸 Saques Rápidos", message: "Levantamentos em menos de 5 min via M-Pesa!" },
];

// ===== JOGOS =====
const GAMES = [
  { id: "aviator", name: "Aviator" },
  { id: "taxi-crash", name: "Taxi Crash" },
  { id: "earplane", name: "Earplane" },
  { id: "purple-crash", name: "Crash" },
  { id: "subway-crash", name: "Subway Crash" },
  { id: "augustus-crash", name: "Augustus Crash" },
  { id: "chicken-highway", name: "Chicken Highway" },
  { id: "mines", name: "Mines" },
  { id: "plinko", name: "Plinko777" },
  { id: "bottle-mania", name: "Bottle Mania" },
  { id: "fishinator", name: "Fishinator" },
  { id: "football-x", name: "Football X" },
  { id: "lion-zama", name: "Lion Zama" },
  { id: "mega-fruits", name: "Mega Fruits" },
];

const AVATARS = [
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=f59e0b",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&backgroundColor=10b981",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Jack&backgroundColor=3b82f6",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Molly&backgroundColor=8b5cf6",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&backgroundColor=ef4444",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe&backgroundColor=ec4899",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Max&backgroundColor=06b6d4",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Lily&backgroundColor=84cc16",
];

const FAKE_IDS = [
  "A8B2C4F1", "F9D3E2A0", "B7C1D9F4", "E4A2B5C1", "D1F8E3A2",
  "C5B4A1F9", "8F2D1A3B", "3C9E4B1F", "2A5B8C1D", "1E7F3D2A",
  "9B1C3A5D", "7F2A4C1B", "5D8E1F2A", "3A6B9C2D", "1C4E7F9A",
  "A1B2C3D4", "E5F6A7B8", "C9D0E1F2", "A3B4C5D6", "E7F8A9B0",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET(req: Request) {
  try {
    // Verificação de segurança
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // ===== 1. AUTO-LIMPEZA: Manter apenas as últimas 200 mensagens =====
    const { count } = await supabaseAdmin
      .from("chat_messages")
      .select("*", { count: "exact", head: true });

    if (count && count > 200) {
      const { data: cutoff } = await supabaseAdmin
        .from("chat_messages")
        .select("created_at")
        .order("created_at", { ascending: false })
        .range(49, 49)
        .single();

      if (cutoff) {
        await supabaseAdmin
          .from("chat_messages")
          .delete()
          .lt("created_at", cutoff.created_at);
      }
    }

    // ===== 2. VERIFICAR proporção de anúncios nas últimas 15 msgs =====
    const { data: recentMsgs } = await supabaseAdmin
      .from("chat_messages")
      .select("type")
      .order("created_at", { ascending: false })
      .limit(15);

    const recentAnnouncements = recentMsgs?.filter(m => m.type === "win_announcement").length || 0;
    const recentSystem = recentMsgs?.filter(m => m.type === "system").length || 0;

    // ===== 3. INSERIR MENSAGENS UMA A UMA (cada INSERT dispara Realtime) =====
    let inserted = 0;
    const numMessages = 3 + Math.floor(Math.random() * 3); // 3 a 5

    for (let i = 0; i < numMessages; i++) {
      const fakeId = pick(FAKE_IDS);
      await supabaseAdmin.from("chat_messages").insert({
        user_id: `fake-${fakeId}`,
        username: fakeId,
        message: pick(FAKE_MESSAGES),
        type: "fake_user",
        avatar: pick(AVATARS),
      });
      inserted++;
      // Delay de 1.2s entre cada mensagem para parecer natural via Realtime
      if (i < numMessages - 1) await delay(1200);
    }

    // ===== 4. ANÚNCIO DE VITÓRIA (máx 1 a cada 15 msgs) =====
    if (recentAnnouncements < 1 && Math.random() < 0.35) {
      await delay(1500);
      const game = pick(GAMES);
      const fakeId = pick(FAKE_IDS);
      const isJackpot = Math.random() < 0.08;
      const amount = isJackpot
        ? Math.floor(Math.random() * 30000) + 3000
        : Math.floor(Math.random() * 2000) + 80;
      const mult = isJackpot
        ? (Math.random() * 25 + 5).toFixed(2)
        : (Math.random() * 8 + 1.2).toFixed(2);

      await supabaseAdmin.from("chat_messages").insert({
        user_id: "system-bot",
        username: "MOZBET BOT",
        message: `${fakeId} ganhou ${amount} MT no ${game.name}!`,
        type: "win_announcement",
        metadata: {
          username: fakeId,
          amount: amount,
          multiplier: mult,
          game_id: game.id,
          game_name: game.name,
        },
      });
      inserted++;
    }

    // ===== 5. MENSAGEM DE SISTEMA (rara — 1 a cada ~7 execuções) =====
    if (recentSystem < 1 && Math.random() < 0.12) {
      await delay(1000);
      const sysMsg = pick(SYSTEM_MESSAGES);
      await supabaseAdmin.from("chat_messages").insert({
        user_id: "system",
        username: "MOZBET",
        message: sysMsg.message,
        type: "system",
        metadata: { title: sysMsg.title },
      });
      inserted++;
    }

    return NextResponse.json({ success: true, inserted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("Cron chat-bot error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
