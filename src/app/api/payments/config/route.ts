import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Valores padrão (fallbacks)
  let minDeposit = 10;
  let maxDeposit = 50000;
  let bonusPercent = 500;

  try {
    // Tenta consultar a tabela de configurações do Supabase caso exista
    const { data: settings, error } = await supabaseAdmin
      .from("settings")
      .select("key, value");

    if (!error && settings) {
      const minSetting = settings.find(s => s.key === "min_deposit");
      const maxSetting = settings.find(s => s.key === "max_deposit");
      const bonusSetting = settings.find(s => s.key === "first_deposit_bonus_percent");

      if (minSetting) minDeposit = Number(minSetting.value);
      if (maxSetting) maxDeposit = Number(maxSetting.value);
      if (bonusSetting) bonusPercent = Number(bonusSetting.value);
    }
  } catch (err) {
    console.log("[API Config Payments] Tabela settings não encontrada, usando fallbacks locais.");
  }

  return NextResponse.json({
    min_deposit: minDeposit,
    max_deposit: maxDeposit,
    first_deposit_bonus_percent: bonusPercent
  });
}
