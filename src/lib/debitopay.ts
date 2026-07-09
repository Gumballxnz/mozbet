/**
 * Módulo de integração com a API DebitoPay
 * URL Base: https://gyqoaningqhurhvdugne.supabase.co/functions/v1
 * 
 * Suporta M-Pesa (síncrono), E-Mola (assíncrono) e M-Kesh (assíncrono).
 */

export type DebitoPayMethod = "mpesa" | "emola" | "mkesh";

const DEBITOPAY_BASE_URL = "https://gyqoaningqhurhvdugne.supabase.co/functions/v1";

/**
 * Processa um depósito via DebitoPay.
 * 
 * @param phone - Número do cliente (9 dígitos, sem prefixo 258)
 * @param amount - Valor do depósito em MZN
 * @param transactionId - ID interno da transação
 * @param method - Método de pagamento ("mpesa" | "emola" | "mkesh")
 */
export async function processDebitoPayment(
  phone: string,
  amount: number,
  transactionId: string,
  method: DebitoPayMethod = "mpesa"
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Carregar credenciais suportando grafias DEBITOPAY_* e DEBITIPAY_*
    const apiKey = process.env.DEBITOPAY_API_KEY || process.env.DEBITIPAY_API_KEY;
    const merchantId = process.env.DEBITOPAY_MERCHANT_ID || process.env.DEBITIPAY_MERCHANT_ID;
    
    let walletCode = "";
    if (method === "mpesa") {
      walletCode = process.env.DEBITOPAY_MPESA_WALLET || process.env.DEBITIPAY_MPESA_WALLET || "";
    } else if (method === "emola") {
      walletCode = process.env.DEBITOPAY_EMOLA_WALLET || process.env.DEBITIPAY_EMOLA_WALLET || "";
    } else if (method === "mkesh") {
      walletCode = process.env.DEBITOPAY_MKESH_WALLET || process.env.DEBITIPAY_MKESH_WALLET || "";
    }

    if (!apiKey || !merchantId || !walletCode) {
      throw new Error(`Credenciais DebitoPay não configuradas para o método ${method.toUpperCase()}. Verifique as variáveis no .env.`);
    }

    // Limpar o telefone para obter os 9 dígitos (ex: 84XXXXXXX)
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("258")) {
      cleanPhone = cleanPhone.substring(3);
    }
    if (cleanPhone.length !== 9) {
      return { success: false, error: "Número de telefone inválido. Deve ter 9 dígitos." };
    }

    const formattedPhone = `258${cleanPhone}`;
    const endpoint = `${DEBITOPAY_BASE_URL}/payment-orchestrator`;

    const payload = {
      action: "process",
      payment_method: method,
      merchant_id: merchantId,
      wallet_code: walletCode,
      amount: amount,
      currency: "MZN",
      phone: formattedPhone,
      source: "gateway",
      source_id: transactionId,
    };

    console.log(`[DebitoPay] Iniciando pagamento via ${method.toUpperCase()} | Transação=${transactionId} | Valor=${amount} MZN | Telefone=${formattedPhone}`);

    // AbortController com timeout de 60 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (controller.signal.aborted) {
        console.error("[DebitoPay] Timeout de 60s atingido.");
        return { success: false, error: "O pagamento demorou mais do que o esperado. Tente novamente." };
      }
      throw err;
    }

    const textData = await response.text();
    let data;
    try {
      data = JSON.parse(textData);
    } catch {
      console.error("[DebitoPay] Resposta inválida (não JSON):", textData);
      return { success: false, error: `Erro no Gateway (HTTP ${response.status}): resposta inesperada.` };
    }

    if (!response.ok) {
      console.error(`[DebitoPay] Erro na API (HTTP ${response.status}):`, data);
      return {
        success: false,
        error: data.error || data.message || `Erro no gateway (HTTP ${response.status}).`,
      };
    }

    console.log(`[DebitoPay] ✅ Pagamento iniciado no gateway:`, data);
    return { success: true, data };

  } catch (error: any) {
    console.error("[DebitoPay] Exceção no processamento:", error.message || error);
    return {
      success: false,
      error: "Serviço de pagamentos temporariamente indisponível. Tente novamente.",
    };
  }
}
