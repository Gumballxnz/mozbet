import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET() {

  let minDeposit = 10;
  let maxDeposit = 17500;
  let bonusPercent = 500;
  let defaultDeposit = 100;
  let activeGateway = "e2payments";
  let minWithdrawal = 65;
  let maxWithdrawalDaily = 25000;

  try {

    const { data: settings, error } = await supabaseAdmin
      .from("settings")
      .select("key, value");

    if (!error && settings) {
      const minSetting = settings.find(s => s.key === "min_deposit");
      const maxSetting = settings.find(s => s.key === "max_deposit");
      const bonusSetting = settings.find(s => s.key === "first_deposit_bonus_percent");
      const defaultSetting = settings.find(s => s.key === "default_deposit");
      const gatewaySetting = settings.find(s => s.key === "active_gateway");
      const minWithdrawSetting = settings.find(s => s.key === "min_withdrawal");
      const maxWithdrawSetting = settings.find(s => s.key === "max_withdrawal_daily");

      if (minSetting) minDeposit = Number(minSetting.value);
      if (maxSetting) maxDeposit = Number(maxSetting.value);
      if (bonusSetting) bonusPercent = Number(bonusSetting.value);
      if (defaultSetting) defaultDeposit = Number(defaultSetting.value);
      if (gatewaySetting) activeGateway = gatewaySetting.value;
      if (minWithdrawSetting) minWithdrawal = Number(minWithdrawSetting.value);
      if (maxWithdrawSetting) maxWithdrawalDaily = Number(maxWithdrawSetting.value);
    }
  } catch (err) {
    console.log("[API Config Payments] Tabela settings não encontrada, usando fallbacks locais.");
  }

  return NextResponse.json({
    min_deposit: minDeposit,
    max_deposit: maxDeposit,
    first_deposit_bonus_percent: bonusPercent,
    default_deposit: defaultDeposit,
    active_gateway: activeGateway,
    min_withdrawal: minWithdrawal,
    max_withdrawal_daily: maxWithdrawalDaily
  });
}
