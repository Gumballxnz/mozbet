"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Save, CreditCard, Shield, Percent, Wallet, AlertTriangle } from "lucide-react";

interface SettingsData {
  min_deposit: string;
  max_deposit: string;
  first_deposit_bonus_percent: string;
  default_deposit: string;
  active_gateway: string;
}

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<SettingsData>({
    min_deposit: "10",
    max_deposit: "17500",
    first_deposit_bonus_percent: "500",
    default_deposit: "100",
    active_gateway: "e2payments",
  });
  
  const [originalConfig, setOriginalConfig] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Falha ao obter configurações");
      const data = await res.json();
      const { _table_missing, ...configData } = data;
      setConfig(configData);
      setOriginalConfig({ ...configData });
      setTableMissing(!!_table_missing);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao carregar configurações.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (field: keyof SettingsData, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const hasChanges = () => {
    if (!originalConfig) return false;
    return (
      config.min_deposit !== originalConfig.min_deposit ||
      config.max_deposit !== originalConfig.max_deposit ||
      config.first_deposit_bonus_percent !== originalConfig.first_deposit_bonus_percent ||
      config.default_deposit !== originalConfig.default_deposit ||
      config.active_gateway !== originalConfig.active_gateway
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Falha ao salvar");
      }

      toast.success("Configurações salvas com sucesso!");
      setOriginalConfig({ ...config });
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-white p-8 flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        Sincronizando parâmetros do sistema...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Configurações Gerais</h1>
        <p className="text-muted-foreground">Gerencie o gateway de pagamento ativo e os limites financeiros da plataforma.</p>
      </div>

      {tableMissing && (
        <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-2xl max-w-4xl space-y-3">
          <div className="flex items-center gap-2 text-red-400 font-bold">
            <AlertTriangle className="w-5 h-5" />
            <span>Tabela 'settings' não encontrada no Supabase</span>
          </div>
          <p className="text-xs text-gray-300">
            A tabela de configurações não existe no seu banco de dados Supabase. O sistema está rodando com valores padrão (fallbacks). 
            Por favor, execute o seguinte comando no <strong>SQL Editor</strong> do seu painel do Supabase para criar a tabela e habilitar a gravação:
          </p>
          <pre className="bg-black/80 p-4 rounded-xl text-xs font-mono text-green-400 overflow-x-auto select-all">
{`CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

INSERT INTO settings (key, value) VALUES
  ('min_deposit', '10'),
  ('max_deposit', '17500'),
  ('first_deposit_bonus_percent', '500'),
  ('default_deposit', '100'),
  ('active_gateway', 'e2payments')
ON CONFLICT (key) DO NOTHING;`}
          </pre>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
        {/* CARD 1: Gateway Ativo */}
        <div className="bg-surface p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-white">Gateway de Pagamentos Ativo</h2>
          </div>
          
          <p className="text-sm text-gray-400">
            Selecione qual gateway de pagamentos processará as transações da MozBet.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* OPÇÃO 1: E2Payments */}
            <div 
              onClick={() => handleChange("active_gateway", "e2payments")}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between h-36 ${
                config.active_gateway === "e2payments"
                  ? "bg-primary/5 border-primary shadow-[0_0_15px_rgba(34,197,94,0.1)] text-white"
                  : "bg-black/40 border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-base text-white">E2Payments</h3>
                  <p className="text-xs text-gray-400 mt-1">Gateway Padrão M-Pesa & e-Mola</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  config.active_gateway === "e2payments" ? "border-primary bg-primary text-black" : "border-white/20"
                }`}>
                  {config.active_gateway === "e2payments" && <span className="text-[10px] font-black">✓</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-300 font-bold">M-Pesa (Vodacom)</span>
                <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-300 font-bold">e-Mola (Movitel)</span>
              </div>
            </div>

            {/* OPÇÃO 2: DebitoPay */}
            <div 
              onClick={() => handleChange("active_gateway", "debitopay")}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between h-36 ${
                config.active_gateway === "debitopay"
                  ? "bg-primary/5 border-primary shadow-[0_0_15px_rgba(34,197,94,0.1)] text-white"
                  : "bg-black/40 border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-base text-white">DebitoPay</h3>
                  <p className="text-xs text-gray-400 mt-1">Payment Orchestrator Multicanal</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  config.active_gateway === "debitopay" ? "border-primary bg-primary text-black" : "border-white/20"
                }`}>
                  {config.active_gateway === "debitopay" && <span className="text-[10px] font-black">✓</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-300 font-bold">M-Pesa</span>
                <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-300 font-bold">e-Mola</span>
                <span className="text-[10px] bg-primary/20 border border-primary/40 px-2 py-0.5 rounded text-primary font-bold">mKesh (Tmcel)</span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: Parâmetros e Limites Financeiros */}
        <div className="bg-surface p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-white">Limites Financeiros de Depósito</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Depósito Mínimo */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" /> Depósito Mínimo (MZN)
              </label>
              <Input
                type="number"
                value={config.min_deposit}
                onChange={e => handleChange("min_deposit", e.target.value)}
                className="bg-black/60 h-10 border-white/10 focus-visible:ring-primary"
                min="1"
                required
              />
            </div>

            {/* Depósito Máximo */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" /> Depósito Máximo (MZN)
              </label>
              <Input
                type="number"
                value={config.max_deposit}
                onChange={e => handleChange("max_deposit", e.target.value)}
                className="bg-black/60 h-10 border-white/10 focus-visible:ring-primary"
                min="1"
                required
              />
            </div>

            {/* Sugestão de Depósito Padrão */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" /> Valor Sugerido Inicial (MZN)
              </label>
              <Input
                type="number"
                value={config.default_deposit}
                onChange={e => handleChange("default_deposit", e.target.value)}
                className="bg-black/60 h-10 border-white/10 focus-visible:ring-primary"
                min="1"
                required
              />
            </div>

            {/* Bónus de Primeiro Depósito */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5" /> Percentual de Bónus no 1º Depósito (%)
              </label>
              <Input
                type="number"
                value={config.first_deposit_bonus_percent}
                onChange={e => handleChange("first_deposit_bonus_percent", e.target.value)}
                className="bg-black/60 h-10 border-white/10 focus-visible:ring-primary"
                min="0"
                required
              />
            </div>
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={!hasChanges() || saving}
            className="bg-primary text-black font-extrabold hover:bg-primary/95 disabled:opacity-40 disabled:cursor-not-allowed gap-2 px-6 h-11"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Salvando..." : hasChanges() ? "Salvar Alterações" : "Sem Alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
}
