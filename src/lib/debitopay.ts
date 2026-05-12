

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

    let cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone.startsWith("258")) {
      cleanPhone = "258" + cleanPhone;
    }
    
    // M-Pesa na doc tem +, e-Mola não tem. Para segurança garantimos ambos formatos.
    if (method === "mpesa") {
        cleanPhone = "+" + cleanPhone;
    }

    const payload = {
      action: "process",
      payment_method: method,
      merchant_id: MERCHANT_ID,
      wallet_code: WALLET_CODE,
      amount: amount,
      currency: "MZN",
      phone: cleanPhone,
      backend_transaction: true,
      source: "gateway",
      source_id: transactionId
    };

    console.log(`[Debito Pay] Iniciando pagamento via ${method}:`, payload);

    // AbortController para não deixar a Vercel dar timeout (limite de 10s no plano Hobby)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos

    let response;
    try {
      response = await fetch("https://gyqoaningqhurhvdugne.supabase.co/functions/v1/payment-orchestrator", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (err: any) {
      if (controller.signal.aborted) {
        // Demorou mais de 8s, o que significa que o USSD já está no telemóvel do cliente!
        console.log(`[Debito Pay] Timeout de 8s atingido. USSD enviado. Assumindo PENDENTE.`);
        return { success: true, data: { status: "pending" } };
      }
      throw err;
    }

    const textData = await response.text();
    let data;
    try {
      data = JSON.parse(textData);
    } catch (e) {
      console.error("[Debito Pay] Resposta inválida (não JSON):", textData);
      return { success: false, error: `Erro no Gateway (HTTP ${response.status}): ${textData.substring(0, 50)}...` };
    }
    
    // Se o status HTTP for um erro ou o status da transação for failed
    if (!response.ok || data.status === "failed" || data.success === false) {
      console.error(`[Debito Pay] Erro na API:`, data);
      return {
        success: false,
        error: `A Debito Pay rejeitou (HTTP ${response.status}): ${data.error || data.message || JSON.stringify(data)}`
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
