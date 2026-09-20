import { supabaseAdmin } from "@/lib/auth-server";
import crypto from "crypto";

export const CONTROLLER_CONFIG = {

  BET_WINDOW: 30 * 1000,

  WIN_RATES: {
    ALL_BETTING: 0.0,
    MAJORITY_BETTING: 0.20,
    MINORITY_BETTING: 0.40,
  },

  MIN_BET: 1,
  MAX_BET: 50000,
};

const activePresence = new Map<string, number>();

export function registerPresence(userId: string): void {
  activePresence.set(userId, Date.now());
}

export async function getRealOnlineCount(): Promise<number> {
  const vpsUrl = process.env.VPS_SOCKET_URL;
  if (!vpsUrl) {
    return 1;
  }

  try {
    const res = await fetch(`${vpsUrl}/api/online-count`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      return Math.max(1, data.count || 1);
    }
  } catch (err) {
    console.error("[Presence] Erro ao buscar contagem de online da VPS:", err);
  }

  return 1;
}

export function getFakeOnlineCount(): number {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  const seed = (now.getDate() * 24 * 60) + (hour * 60) + minute;

  let rangeMin = 80;
  let rangeMax = 150;

  if ((hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 23)) {
    rangeMin = 350;
    rangeMax = 580;
  } else if (hour >= 2 && hour <= 6) {

    rangeMin = 40;
    rangeMax = 90;
  } else {

    rangeMin = 150;
    rangeMax = 280;
  }

  const pseudoRandom = Math.abs(Math.sin(seed * 9999));

  return Math.floor(rangeMin + pseudoRandom * (rangeMax - rangeMin));
}

const recentBets = new Map<string, number>();

export function registerBet(userId: string): void {
  recentBets.set(userId, Date.now());
}

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

export async function shouldPlayerWin(userId: string): Promise<boolean> {

  registerBet(userId);

  const onlineCount = await getRealOnlineCount();
  const bettorsCount = getActiveBettorsCount();
  const ratio = bettorsCount / onlineCount;

  let winRate: number;
  if (ratio >= 0.9) {

    winRate = CONTROLLER_CONFIG.WIN_RATES.ALL_BETTING;
  } else if (ratio >= 0.5) {

    winRate = CONTROLLER_CONFIG.WIN_RATES.MAJORITY_BETTING;
  } else {

    winRate = CONTROLLER_CONFIG.WIN_RATES.MINORITY_BETTING;
  }

  const randomValue = crypto.randomBytes(4).readUInt32BE(0) / 0xFFFFFFFF;
  const wins = randomValue < winRate;

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[GameController] User=${userId.slice(0, 8)} | Online=${onlineCount} | Bettors=${bettorsCount} | Ratio=${(ratio * 100).toFixed(0)}% | WinRate=${(winRate * 100).toFixed(0)}% | Result=${wins ? "WIN" : "LOSS"}`
    );
  }

  return wins;
}

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

  if (newBonus > 0) {
    if (newBonus >= remainingAmount) {
      newBonus -= remainingAmount;
      remainingAmount = 0;
    } else {
      remainingAmount -= newBonus;
      newBonus = 0;
    }
  }

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
