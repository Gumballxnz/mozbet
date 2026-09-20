import { createClient } from "@supabase/supabase-js";
import { io } from "socket.io-client";
import crypto from "crypto";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Carregar variáveis de ambiente do .env.local ou .env
if (fs.existsSync(path.resolve(process.cwd(), ".env.local"))) {
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
} else {
  dotenv.config();
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const SOCKET_PORT = process.env.SOCKET_PORT || 3001;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ [Game Engine] NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no arquivo de ambiente.");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// Conectar ao servidor realtime Socket.io local
const socket = io(`http://localhost:${SOCKET_PORT}`, {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionDelay: 2000,
});

socket.on("connect", () => {
  console.log(`🔌 [Game Engine] Conectado ao servidor Realtime na porta ${SOCKET_PORT}`);
});

socket.on("connect_error", (err) => {
  console.warn(`⚠️ [Game Engine] Falha ao conectar ao Realtime Socket: ${err.message}. Tentando novamente...`);
});

const GAME_CONFIG = {
  WAITING_TIME: 5000,
  POST_CRASH_DELAY: 3000,
  SPEED_FACTOR: 0.06, // Fórmula Aviator: multiplier = e^(0.06 * t_segundos)
};

function generateServerSeed() {
  return crypto.randomBytes(32).toString("hex");
}

function hashSeed(seed) {
  return crypto.createHash("sha256").update(seed).digest("hex");
}

function generateCrashPoint() {
  const randomBytes = crypto.randomBytes(4);
  const random = randomBytes.readUInt32BE(0) / 0xffffffff;

  // 2% de probabilidade de crash imediato no 1.00x
  if (random < 0.02) {
    return 1.00;
  }

  const houseEdge = 0.98;
  const crashPoint = Math.max(1.01, Math.floor((houseEdge / (1 - random)) * 100) / 100);
  return Math.min(crashPoint, 100.00);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const CRASH_GAMES = ["aviator", "earplane", "crash"];
let isRunning = true;

async function runGameLoop(gameId) {
  console.log(`🚀 [Game Engine] Inicializando loop contínuo para: ${gameId}`);

  while (isRunning) {
    try {
      // 1. FASE DE ESPERA (WAITING)
      const serverSeed = generateServerSeed();
      const crashPoint = generateCrashPoint();
      const waitingEndsAt = new Date(Date.now() + GAME_CONFIG.WAITING_TIME);

      const { data: round, error: createErr } = await supabaseAdmin
        .from("game_rounds")
        .insert({
          game_id: gameId,
          server_seed: serverSeed,
          crash_point: crashPoint,
          status: "waiting",
          started_at: waitingEndsAt.toISOString(),
        })
        .select("id, game_id, status, started_at")
        .single();

      if (createErr || !round) {
        console.error(`[${gameId}] Erro ao registrar nova ronda:`, createErr?.message);
        await sleep(3000);
        continue;
      }

      socket.emit("internal_broadcast", {
        room: `game_${gameId}`,
        event: "game_round_waiting",
        data: {
          gameId,
          roundId: round.id,
          status: "waiting",
          startedAt: round.started_at,
          seedHash: hashSeed(serverSeed),
          countdown: Math.round(GAME_CONFIG.WAITING_TIME / 1000),
        },
      });

      await sleep(GAME_CONFIG.WAITING_TIME);
      if (!isRunning) break;

      // 2. FASE DE SUBIDA (RUNNING)
      const flightStartedAt = new Date();
      await supabaseAdmin
        .from("game_rounds")
        .update({
          status: "running",
          started_at: flightStartedAt.toISOString(),
        })
        .eq("id", round.id);

      socket.emit("internal_broadcast", {
        room: `game_${gameId}`,
        event: "game_round_start",
        data: {
          gameId,
          roundId: round.id,
          status: "running",
          startedAt: flightStartedAt.toISOString(),
        },
      });

      // Cálculo do tempo de voo baseado no crashPoint:
      // multiplier = e^(0.06 * t) => t = ln(multiplier) / 0.06
      let flightDurationMs = 0;
      if (crashPoint > 1.00) {
        const flightDurationSec = Math.log(crashPoint) / GAME_CONFIG.SPEED_FACTOR;
        flightDurationMs = Math.max(0, Math.floor(flightDurationSec * 1000));
      }

      await sleep(flightDurationMs);
      if (!isRunning) break;

      // 3. FASE DE CRASH (CRASHED)
      const crashedAt = new Date();
      await supabaseAdmin
        .from("game_rounds")
        .update({
          status: "crashed",
          crashed_at: crashedAt.toISOString(),
        })
        .eq("id", round.id);

      // Marca todas as apostas ativas desta ronda que não fizeram cashout como "lost"
      await supabaseAdmin
        .from("bets")
        .update({ status: "lost" })
        .eq("round_id", round.id)
        .eq("status", "active");

      socket.emit("internal_broadcast", {
        room: `game_${gameId}`,
        event: "game_round_crashed",
        data: {
          gameId,
          roundId: round.id,
          status: "crashed",
          crashPoint,
          crashedAt: crashedAt.toISOString(),
        },
      });

      // Delay após o crash antes de iniciar a próxima ronda
      await sleep(GAME_CONFIG.POST_CRASH_DELAY);
    } catch (err) {
      console.error(`[${gameId}] Exceção no ciclo de jogo:`, err);
      await sleep(3000);
    }
  }
}

// Inicializar os loops de todos os crash games concorrentemente
CRASH_GAMES.forEach((gameId) => {
  runGameLoop(gameId);
});

// Finalização graciosa
function gracefulShutdown() {
  console.log("🛑 [Game Engine] Encerrando processos de jogo...");
  isRunning = false;
  socket.disconnect();
  setTimeout(() => process.exit(0), 1000);
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
