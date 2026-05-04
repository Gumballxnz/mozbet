
import { NextResponse } from "next/server";
import { verifyToken, supabaseAdmin } from "@/lib/auth-server";

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
  "Quem não arrisca não petisca, bora lá!",
  "Já fiz meu dia no Subway Crash, tchau!",
  "Tô a espera do meu saque, Mozbet não falha",
  "Fiz 1000MT com 50MT, hoje o jantar é por minha conta 🍗",
  "Alguém tem estratégia pro Earplane?",
  "Perdi 200MT mas já recuperei 300MT no Taxi 🚕🔥"
];

const GAMES = ["aviator", "mines", "taxi-crash", "subway-crash", "earplane", "plinko"];

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie");
    const token = cookieHeader?.split("; ").find(r => r.startsWith("mozbet_session="))?.split("=")[1];

    if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    const decoded = await verifyToken<{ id: string; phone: string }>(token);
    if (!decoded) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

    const { message, avatar } = await req.json();
    if (!message) return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });

    // 1. Salvar mensagem do utilizador real (Usamos o ID, NUNCA o número de telefone)
    const { data: userMsg, error: userErr } = await supabaseAdmin
      .from("chat_messages")
      .insert({
        user_id: decoded.id,
        username: decoded.id.split('-')[0].toUpperCase(), // Usar o ID, não o telefone
        message: message,
        type: "message",
        metadata: avatar ? { avatar } : {}
      })
      .select()
      .single();

    if (userErr) throw userErr;

    // 2. Chance de 60% de um BOT responder (Chat mais ativo)
    if (Math.random() < 0.6) {
      setTimeout(async () => {
        const randomSlang = MOZ_SLANG[Math.floor(Math.random() * MOZ_SLANG.length)];
        const fakeId = Math.random().toString(36).substring(2, 10).toUpperCase();
        
        await supabaseAdmin.from("chat_messages").insert({
          user_id: `fake-${fakeId}`,
          username: fakeId,
          message: randomSlang,
          type: "fake_user"
        });
      }, 1500);
    }

    // 3. Chance de 8% de gerar um anúncio de vitória (Espaçado para não poluir)
    if (Math.random() < 0.08) {
      setTimeout(async () => {
        const game = GAMES[Math.floor(Math.random() * GAMES.length)];
        const amount = Math.floor(Math.random() * 3000) + 100;
        const mult = (Math.random() * 10 + 1.2).toFixed(2);
        const fakeId = Math.random().toString(36).substring(2, 10).toUpperCase();

        await supabaseAdmin.from("chat_messages").insert({
          user_id: "system-bot",
          username: "MOZBET BOT",
          message: `${fakeId} ganhou ${amount} MT no ${game}!`,
          type: "win_announcement",
          metadata: {
            username: fakeId,
            amount: amount,
            multiplier: mult,
            game_id: game,
            game_name: game.toUpperCase()
          }
        });
      }, 3000);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
