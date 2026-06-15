import { NextRequest, NextResponse } from "next/server";
import { verifyToken, supabaseAdmin } from "@/lib/auth-server";
import { shouldPlayerWin, validateBet, deductBalance, registerPresence } from "@/lib/game-controller";
import crypto from "crypto";

const MULTIPLIERS_16 = [333, 100, 50, 15, 7, 2, 1, 0.5, 0.1, 0.5, 1, 2, 7, 15, 50, 100, 333];
const MULTIPLIERS_14 = [100, 50, 15, 7, 2, 1, 0.5, 0.1, 0.5, 1, 2, 7, 15, 50, 100];
const MULTIPLIERS_12 = [50, 15, 7, 2, 1, 0.5, 0.1, 0.5, 1, 2, 7, 15, 50];

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("mozbet_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Faça login para jogar" }, { status: 401 });
    }

    const payload = await verifyToken<{ id: string }>(token);
    if (!payload?.id) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    registerPresence(payload.id);

    const { betAmount, pins, risk } = await req.json();

    if (![12, 14, 16].includes(pins)) {
      return NextResponse.json({ error: "Número de pinos inválido" }, { status: 400 });
    }

    const validation = await validateBet(payload.id, betAmount);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const newBalance = await deductBalance(payload.id, validation.balance!, betAmount);

    const playerWins = await shouldPlayerWin(payload.id);

    const MULTIPLIERS = pins === 16 ? MULTIPLIERS_16 : pins === 14 ? MULTIPLIERS_14 : MULTIPLIERS_12;

    // Separate slots into winning (>= 1) and losing (< 1)
    const winSlots: number[] = [];
    const loseSlots: number[] = [];
    
    MULTIPLIERS.forEach((m, index) => {
      if (m < 1) loseSlots.push(index);
      else winSlots.push(index);
    });

    let finalSlot = 0;
    
    if (playerWins) {
      // Pick a win slot (weighted towards lower wins to prevent bankruptcy, but random)
      // Simpler: just pick random from winSlots
      // Actually, let's weight it so 1x, 2x are more common than 333x
      const rand = crypto.randomBytes(1)[0] / 255;
      if (rand < 0.6) {
        // 60% chance for small win (1x - 2x)
        const smallWins = winSlots.filter(i => MULTIPLIERS[i] <= 2);
        finalSlot = smallWins[Math.floor(Math.random() * smallWins.length)];
      } else if (rand < 0.9) {
        // 30% chance for medium win (7x - 15x)
        const medWins = winSlots.filter(i => MULTIPLIERS[i] > 2 && MULTIPLIERS[i] <= 15);
        finalSlot = medWins.length > 0 ? medWins[Math.floor(Math.random() * medWins.length)] : winSlots[0];
      } else {
        // 10% chance for big win
        const bigWins = winSlots.filter(i => MULTIPLIERS[i] > 15);
        finalSlot = bigWins.length > 0 ? bigWins[Math.floor(Math.random() * bigWins.length)] : winSlots[0];
      }
    } else {
      // Pick a lose slot
      finalSlot = loseSlots[Math.floor(Math.random() * loseSlots.length)];
    }

    const multiplier = MULTIPLIERS[finalSlot];
    const winnings = parseFloat((betAmount * multiplier).toFixed(2));
    const profit = parseFloat((winnings - betAmount).toFixed(2));

    // Generate path
    // finalSlot equals the number of Right (+1) steps
    const numRights = finalSlot;
    const numLefts = pins - finalSlot;
    
    const steps = [];
    for(let i=0; i<numRights; i++) steps.push(1);
    for(let i=0; i<numLefts; i++) steps.push(-1);
    
    // Shuffle steps
    for (let i = steps.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [steps[i], steps[j]] = [steps[j], steps[i]];
    }

    const path: number[] = [];
    let pos = 0;
    for (let i = 0; i < pins; i++) {
      pos += steps[i];
      const slot = Math.max(0, Math.min(MULTIPLIERS.length - 1, Math.round((pos + pins) / 2)));
      path.push(slot);
    }

    // Save session
    const sessionId = crypto.randomUUID();
    await supabaseAdmin
      .from("game_sessions")
      .insert({
        id: sessionId,
        user_id: payload.id,
        game_id: "plinko",
        bet_amount: betAmount,
        status: "won", // Auto completes
        game_data: { pins, risk, path, finalSlot },
        result: { multiplier, winnings, profit },
      });

    await supabaseAdmin.from("bets").insert({
      user_id: payload.id,
      round_id: sessionId,
      amount: betAmount,
      status: "cashed_out",
      cashout_multiplier: multiplier,
      profit
    });

    // Credit winnings if any
    let finalBalance = newBalance;
    if (winnings > 0) {
      const { data: user } = await supabaseAdmin.from("users").select("balance").eq("id", payload.id).single();
      finalBalance = parseFloat((Number(user?.balance || 0) + winnings).toFixed(2));
      await supabaseAdmin.from("users").update({ balance: finalBalance }).eq("id", payload.id);

      // Registrar comissão negativa do afiliado (50% do ganho)
      try {
        const { registerAffiliateActivity } = await import("@/lib/affiliate");
        await registerAffiliateActivity(payload.id, "WIN", winnings, sessionId);
      } catch (affErr) {
        console.error("Erro ao registrar débito de afiliado no Plinko:", affErr);
      }
    }

    // Announce big wins
    if (profit > 100) {
      const shortId = payload.id.split("-")[0].toUpperCase();
      await supabaseAdmin.from("chat_messages").insert({
        user_id: payload.id,
        username: shortId.slice(0, 4) + "***",
        message: `Acertou no multiplicador ${multiplier}x no Plinko e ganhou ${winnings.toLocaleString("pt-BR")} MZN!`,
        type: "win_announcement",
        metadata: { amount: winnings, multiplier, profit, game_id: "plinko", game_name: "Plinko" },
      });
    }

    return NextResponse.json({
      path,
      finalSlot,
      multiplier,
      winnings,
      newBalance: finalBalance
    });
  } catch (error) {
    console.error("Erro no Plinko:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
