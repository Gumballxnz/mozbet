// Motor de Jogo Provably Fair — Lógica central server-side
// NUNCA importar este ficheiro no frontend!

import crypto from "crypto";

// ==========================================
// GERAÇÃO DO CRASH POINT (DADO RESTRITO)
// ==========================================
// House edge: 98% — taxa de vitória do jogador: ~2%
// Este valor NUNCA é exposto ao frontend

export function generateCrashPoint(): number {
  const randomBytes = crypto.randomBytes(4);
  const random = randomBytes.readUInt32BE(0) / 0xFFFFFFFF;

  // 2% de chance: crash instantâneo em 1.00x (perda garantida)
  if (random < 0.02) {
    return 1.00;
  }

  // Distribuição exponencial inversa com house edge de 98%
  const houseEdge = 0.98;
  const crashPoint = Math.max(1.01, Math.floor((houseEdge / (1 - random)) * 100) / 100);

  // Cap máximo em 100x para evitar pagamentos absurdos
  return Math.min(crashPoint, 100.00);
}

// ==========================================
// GERAÇÃO DE SEEDS CRIPTOGRÁFICOS
// ==========================================

export function generateServerSeed(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashSeed(seed: string): string {
  return crypto.createHash("sha256").update(seed).digest("hex");
}

// ==========================================
// CONFIGURAÇÃO DE TIMING DO JOGO
// ==========================================

export const GAME_CONFIG = {
  // Tempo de espera antes da ronda começar (ms)
  WAITING_TIME: 5000,
  // Intervalo de atualização do multiplicador (ms)
  TICK_INTERVAL: 80,
  // Tempo após crash para iniciar nova ronda (ms)
  POST_CRASH_DELAY: 3000,
  // Aposta mínima (MZN)
  MIN_BET: 1,
  // Aposta máxima (MZN)
  MAX_BET: 50000,
};
