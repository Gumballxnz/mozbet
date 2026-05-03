
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";

const MOZ_SLANG = [
  "Este Aviator só me come o mola, fds! 😤",
  "Saquei 500MT agora, o motor tá quente 🔥",
  "Alguém aí já ganhou hoje? Ou só eu é que estou a ser comido?",
  "Aviator voou cedo demais, bandidos!",
  "Mines é pra quem tem coração, eu não tenho kkkk",
  "Mozbet pagou! 2 minutos e o M-Pesa cantou 💸",
  "Parem de chorar e apostem com cabeça",
  "Esse gajo só ganha, deve ser feitiço 😂",
  "Mines me deu 200MT agora, vou fugir antes que me comam",
  "Aviator tá a pagar muito hoje pessoal, aproveitem!",
  "Fiz 1000MT com 50MT, hoje o jantar é por minha conta 🍗",
  "Taxi Crash tá a pagar bem agora, entrem lá!",
  "Mais um saque de 1500MT na conta, obrigado Mozbet!",
  "O gajo do Mines limpou tudo, kkkk",
  "Quem não arrisca não petisca, bora lucrar!"
];

const GAMES = [
  { id: "aviator", name: "AVIATOR" },
  { id: "mines", name: "MINES" },
  { id: "taxi-crash", name: "TAXI CRASH" },
  { id: "subway-crash", name: "SUBWAY CRASH" },
  { id: "earplane", name: "EARPLANE" }
];

export async function GET() {
  try {
    // 1. Verificar se a última mensagem foi há menos de 15 segundos para não inundar
    const { data: lastMsg } = await supabaseAdmin
      .from("chat_messages")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const now = new Date();
    const lastTime = lastMsg ? new Date(lastMsg.created_at) : new Date(0);
    const diffSeconds = (now.getTime() - lastTime.getTime()) / 1000;

    // Se já houve uma mensagem recentemente (menos de 15s), não fazemos nada
    if (diffSeconds < 15) {
      return NextResponse.json({ status: "waiting" });
    }

    // 2. Decidir o que enviar (60% Slang, 40% Vitória)
    const isWin = Math.random() < 0.4;

    if (isWin) {
      const g = GAMES[Math.floor(Math.random() * GAMES.length)];
      const amount = Math.floor(Math.random() * 50000) + 250;
      const mult = (Math.random() * 30 + 1.1).toFixed(2);
      const fakeId = Math.random().toString(36).substring(2, 6).toUpperCase();

      await supabaseAdmin.from("chat_messages").insert({
        user_id: "system-bot",
        username: "MOZBET BOT",
        message: `${fakeId} ganhou ${amount} MT no ${g.name}!`,
        type: "win_announcement",
        metadata: {
          username: `${fakeId}***`,
          amount: amount,
          multiplier: mult,
          game_id: g.id,
          game_name: g.name
        }
      });
      return NextResponse.json({ status: "sent_win" });
    } else {
      const slang = MOZ_SLANG[Math.floor(Math.random() * MOZ_SLANG.length)];
      const fakeId = Math.random().toString(36).substring(2, 6).toUpperCase();

      await supabaseAdmin.from("chat_messages").insert({
        user_id: `fake-${fakeId}`,
        username: fakeId,
        message: slang,
        type: "fake_user"
      });
      return NextResponse.json({ status: "sent_slang" });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
