import { createClient } from "@supabase/supabase-js";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Carregar variáveis do .env.local ou .env
if (fs.existsSync(path.resolve(process.cwd(), ".env.local"))) {
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
} else {
  dotenv.config();
}

const app = express();
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Casino";

let supabase = null;
if (SUPABASE_URL && SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SERVICE_KEY);
} else {
  console.warn("⚠️ [Realtime] Credenciais Supabase não definidas. O servidor funcionará sem persistência de jogos.");
}

const SHARED_FAKE_IDS = [
  "A8B2C4F1", "F9D3E2A0", "B7C1D9F4", "E4A2B5C1", "D1F8E3A2",
  "C5B4A1F9", "8F2D1A3B", "3C9E4B1F", "2A5B8C1D", "1E7F3D2A",
  "9B1C3A5D", "7F2A4C1B", "5D8E1F2A", "3A6B9C2D", "1C4E7F9A",
  "A1B2C3D4", "E5F6A7B8", "C9D0E1F2", "A3B4C5D6", "E7F8A9B0"
];

const CHAT_TEMPLATES = [
  "Bora lucrar hoje! 🔥",
  "Alguém ganhou no Aviator?",
  `${APP_NAME} pagando muito hoje 💰`,
  "Saquei agora no M-Pesa",
  "O Crash tá voando alto!",
  "Quem tá jogando?",
  "Mines ou Aviator?",
  "Boa noite pessoal 🍀",
  "Acabei de fazer 1000MT!",
  "Plataforma top demais",
  "M-Pesa caiu na hora! 🚀",
  "Alguém tem estratégia pro Mines?",
  "Taxi Crash subiu muito agora!",
  "Melhor site sem dúvidas",
  "E-Mola também tá rápido?",
  "Sorte pra nós pessoal"
];

let activeGames = [];
let liveBetsHistory = [];

async function loadGames() {
  if (!supabase) return;
  try {
    const { data } = await supabase.from("games").select("*").eq("is_active", true);
    if (data && data.length > 0) activeGames = data;
  } catch (err) {
    console.error("[Realtime] Erro ao carregar jogos:", err);
  }
}
loadGames();
setInterval(loadGames, 300000);

// Endpoint de contagem online consumido pelo Next.js (game-controller.ts)
app.get("/api/online-count", (req, res) => {
  const socketCount = io.engine ? io.engine.clientsCount : 1;
  res.json({ count: Math.max(1, socketCount) });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

io.on("connection", (socket) => {
  socket.on("request_live_bets", () => {
    socket.emit("initial_live_bets", liveBetsHistory);
  });

  socket.on("internal_broadcast", (payload) => {
    if (payload.room) {
      io.to(payload.room).emit(payload.event, payload.data);
    } else {
      io.emit(payload.event, payload.data);
    }
  });

  socket.on("join_room", (room) => socket.join(room));
  socket.on("leave_room", (room) => socket.leave(room));

  socket.on("send_message", (data) => {
    io.to("chat_global").emit("receive_message", data);
  });
});

// Gerador de mensagens simuladas de chat
const sendFakeMessage = () => {
  const username = SHARED_FAKE_IDS[Math.floor(Math.random() * SHARED_FAKE_IDS.length)];
  const message = CHAT_TEMPLATES[Math.floor(Math.random() * CHAT_TEMPLATES.length)];

  io.to("chat_global").emit("receive_message", {
    id: "fake-" + Date.now(),
    username,
    message,
    avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=" + username,
    type: "fake_user",
    created_at: new Date().toISOString(),
  });

  setTimeout(sendFakeMessage, 6000 + Math.random() * 12000);
};
setTimeout(sendFakeMessage, 3000);

// Gerador de apostas simuladas ao vivo
const sendFakeLiveBet = () => {
  if (activeGames.length === 0) return setTimeout(sendFakeLiveBet, 2000);

  const hotGames = activeGames.filter((g) => g.is_hot);
  const normalGames = activeGames.filter((g) => !g.is_hot);

  const isHot = Math.random() < 0.6;
  let pool = isHot && hotGames.length > 0 ? hotGames : normalGames;
  if (pool.length === 0) pool = activeGames;

  const game = pool[Math.floor(Math.random() * pool.length)];
  const fakeId = SHARED_FAKE_IDS[Math.floor(Math.random() * SHARED_FAKE_IDS.length)];
  const baseBets = [10, 50, 100, 200, 500, 1000];
  const betAmount = baseBets[Math.floor(Math.random() * baseBets.length)];

  const isLoss = Math.random() < 0.3;
  const multiplier = Number((1.01 + Math.random() * 8).toFixed(2));
  const payout = isLoss ? 0 : Number((betAmount * multiplier).toFixed(2));

  const fakeBet = {
    game: game.name,
    gameIcon: game.banner_url || `/api/img/banner-${game.id}`,
    id: fakeId,
    time: new Date().toLocaleTimeString("pt-PT", { hour12: false }),
    betAmount,
    multiplier,
    payout,
    isLoss,
    isNew: true,
    isReal: false,
  };

  liveBetsHistory.unshift(fakeBet);
  if (liveBetsHistory.length > 20) liveBetsHistory.pop();

  io.emit("live_bet", fakeBet);

  setTimeout(sendFakeLiveBet, 2500 + Math.random() * 4500);
};
setTimeout(sendFakeLiveBet, 2000);

const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 [Realtime Server] Rodando na porta ${PORT}`);
});
