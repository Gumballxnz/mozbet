

export type DebitoPaymentMethod = "mpesa" | "emola";

export async function processDebitoPayment(
  phone: string,
  amount: number,
  transactionId: string,
  method: DebitoPaymentMethod = "mpesa"
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const API_KEY = process.env.DEBITOPAY_API_KEY;
    const MERCHANT_ID = process.env.DEBITOPAY_MERCHANT_ID;
    const WALLET_CODE = method === "emola" 
        ? process.env.DEBITOPAY_WALLET_EMOLA 
        : process.env.DEBITOPAY_WALLET_MPESA;

    if (!API_KEY || !MERCHANT_ID || !WALLET_CODE) {
      throw new Error("Credenciais da Debito Pay não configuradas nas variáveis de ambiente.");
    }

    // A Debito Pay precisa que o telefone de Moçambique tenha o indicativo internacional +258
    let cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone.startsWith("258")) {
      cleanPhone = "258" + cleanPhone;
    }
    cleanPhone = "+" + cleanPhone;

    const payload = {
      action: "process",
      payment_method: method,
      merchant_id: MERCHANT_ID,
      wallet_code: WALLET_CODE,
      amount: amount,
      currency: "MZN",
      phone: cleanPhone,
      source: "gateway",
      source_id: transactionId
    };

    console.log(`[Debito Pay] Iniciando pagamento via ${method}:`, payload);

    const response = await fetch("https://gyqoaningqhurhvdugne.supabase.co/functions/v1/payment-orchestrator", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      console.error(`[Debito Pay] Erro na API:`, data);
      return {
        success: false,
        error: data.error || `Erro ao processar pagamento via ${method}. Verifique o número e o valor.`
      };
    }

    console.log(`[Debito Pay] Pagamento criado:`, data);
    return { success: true, data };
  } catch (error) {
    console.error("[Debito Pay] Erro Exception:", error);
    return {
      success: false,
      error: "Serviço de pagamentos temporariamente indisponível."
    };
  }
}
