import crypto from "crypto";

export function generateCrashPoint(): number {
  const randomBytes = crypto.randomBytes(4);
  const random = randomBytes.readUInt32BE(0) / 0xFFFFFFFF;

  if (random < 0.02) {
    return 1.00;
  }

  const houseEdge = 0.98;
  const crashPoint = Math.max(1.01, Math.floor((houseEdge / (1 - random)) * 100) / 100);

  return Math.min(crashPoint, 100.00);
}

export function generateServerSeed(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashSeed(seed: string): string {
  return crypto.createHash("sha256").update(seed).digest("hex");
}

export const GAME_CONFIG = {

  WAITING_TIME: 5000,

  TICK_INTERVAL: 80,

  POST_CRASH_DELAY: 3000,

  MIN_BET: 1,

  MAX_BET: 50000,
};
