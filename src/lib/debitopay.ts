
export type DebitoPaymentMethod = "mpesa" | "emola";

const DEBITOPAY_API_URL = "https://gyqoaningqhurhvdugne.supabase.co/functions/v1/payment-orchestrator";

/**
 * Consulta o estado de um pagamento na API da Debito Pay.
 * Usa o endpoint check-status do payment-orchestrator.
 */
export async function checkDebitoPayStatus(paymentId: string): Promise<{
  success: boolean;
  status?: string;
  data?: any;
  error?: string;
}> {
  try {
    const API_KEY = process.env.DEBITOPAY_API_KEY;
    if (!API_KEY) return { success: false, error: "API Key não configurada" };

    const response = await fetch(DEBITOPAY_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "check-status",
        payment_id: paymentId,
      }),
    });

    const textData = await response.text();
    let data;
    try {
      data = JSON.parse(textData);
    } catch {
      return { success: false, error: `Resposta inválida da DebitoPay: ${textData.substring(0, 100)}` };
    }

    if (!data.success) {
      return { success: false, error: data.error || "Erro ao verificar estado" };
    }

    console.log(`[Debito Pay] check-status para ${paymentId}:`, data.payment?.status);
    return { success: true, status: data.payment?.status, data: data.payment };
  } catch (error: any) {
    console.error("[Debito Pay] Erro ao verificar estado:", error.message);
    return { success: false, error: "Erro de conexão ao verificar estado" };
  }
}

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
      source_id: transactionId
    };

    console.log(`[Debito Pay] Iniciando pagamento via ${method}:`, payload);

    // AbortController para não deixar a Vercel dar timeout (limite de 10s no plano Hobby)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos

    let response;
    try {
      response = await fetch(DEBITOPAY_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "Origin": "https://mozbet.online",
          "Referer": "https://mozbet.online"
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
