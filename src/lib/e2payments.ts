/**
 * MOZBET - Módulo de Integração e2Payments (M-Pesa)
 * 
 * Baseado na documentação oficial: e2paymentdocs.md
 * Implementação segura que RODA APENAS NO SERVIDOR.
 * Nenhuma credencial é exposta ao utilizador.
 * 
 * Fluxo C2B (Customer to Business):
 * 1. Geramos um token OAuth2 com client_id + client_secret
 * 2. Enviamos POST para /v1/c2b/mpesa-payment/{wallet_id}
 * 3. O M-Pesa envia USSD push para o telefone do cliente
 * 4. Cliente confirma com PIN → e2Payments notifica via webhook (callback)
 */

// URL base oficial conforme documentação e2Payments
const E2P_BASE_URL = "https://e2payments.explicador.co.mz";

interface E2PTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

// Cache do token em memória do servidor (evita gerar token a cada pedido)
let cachedToken: string | null = null;
let tokenExpiryTime: number = 0;

/**
 * 1. Obter Token de Autenticação OAuth2
 * POST https://e2payments.explicador.co.mz/oauth/token
 */
async function getAuthToken(): Promise<string> {
  // Se o token ainda for válido, reutilizamos
  if (cachedToken && Date.now() < tokenExpiryTime) {
    return cachedToken;
  }

  const clientId = process.env.E2P_CLIENT_ID;
  const clientSecret = process.env.E2P_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Credenciais e2Payments (E2P_CLIENT_ID / E2P_CLIENT_SECRET) não configuradas.");
  }

  const response = await fetch(`${E2P_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[e2Payments] Erro ao gerar token:", response.status, errorText);
    throw new Error(`Falha na autenticação e2Payments (${response.status})`);
  }

  const data: E2PTokenResponse = await response.json();

  cachedToken = data.access_token;
  // Guardar expiração com 5 minutos de margem de segurança
  tokenExpiryTime = Date.now() + (data.expires_in - 300) * 1000;

  console.log("[e2Payments] Token gerado com sucesso. Expira em:", data.expires_in, "segundos");
  return data.access_token;
}

/**
 * 2. Iniciar Pagamento C2B (Depósito via M-Pesa)
 * POST https://e2payments.explicador.co.mz/v1/c2b/mpesa-payment/{wallet_id}
 * 
 * Payload conforme documentação:
 * {
 *   "client_id": "...",
 *   "amount": "30",
 *   "phone": "848512345",
 *   "reference": "MozbetDeposito"
 * }
 * 
 * Resultado: O telemóvel do cliente recebe um popup USSD do M-Pesa/E-Mola
 * pedindo o PIN para confirmar o pagamento.
 * 
 * @param method - "mpesa" ou "emola"
 */
export type PaymentMethod = "mpesa" | "emola";

export async function initiateC2BPayment(
  phone: string,
  amount: number,
  transactionId: string,
  method: PaymentMethod = "mpesa"
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const token = await getAuthToken();
    const clientId = process.env.E2P_CLIENT_ID;

    // Seleccionar a carteira com base no método de pagamento
    const walletId = method === "emola"
      ? process.env.E2P_WALLET_EMOLA
      : process.env.E2P_WALLET_MPESA;

    const methodLabel = method === "emola" ? "E-Mola" : "M-Pesa";

    if (!walletId) {
      throw new Error(`Carteira ${methodLabel} (E2P_WALLET_${method.toUpperCase()}) não configurada.`);
    }

    // A API pede os telefones com 9 dígitos (sem código do país)
    const cleanPhone = phone.replace(/^\+?258/, "").replace(/\D/g, "");

    // Composição do Header conforme documentação
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
    };

    // Payload conforme documentação oficial da e2Payments
    const payload = {
      client_id: clientId,
      amount: String(amount),       // A API espera uma string
      phone: cleanPhone,            // 9 dígitos, ex: 848512345
      reference: `MozbetDep${transactionId.substring(0, 8)}`, // Sem espaços, conforme docs
    };

    // O endpoint varia conforme o método de pagamento
    const endpoint = method === "emola"
      ? `${E2P_BASE_URL}/v1/c2b/mpesa-payment/${walletId}`  // E-Mola usa o mesmo endpoint base
      : `${E2P_BASE_URL}/v1/c2b/mpesa-payment/${walletId}`;

    console.log(`[e2Payments] Iniciando C2B via ${methodLabel}:`, {
      wallet: walletId,
      phone: cleanPhone,
      amount,
      reference: payload.reference,
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[e2Payments] Erro C2B ${methodLabel}:`, response.status, errorData);
      return {
        success: false,
        error: `Erro ao processar pagamento ${methodLabel} (${response.status}). Verifique o número e o valor.`,
      };
    }

    const data = await response.json();
    console.log(`[e2Payments] C2B ${methodLabel} Sucesso:`, data);

    return { success: true, data };

  } catch (error) {
    console.error("[e2Payments] Erro C2B Payment:", error);
    return {
      success: false,
      error: "Serviço de pagamentos temporariamente indisponível. Tente novamente em alguns minutos.",
    };
  }
}

/**
 * 3. Listar todas as carteiras (útil para debug no admin)
 * POST https://e2payments.explicador.co.mz/v1/wallets/mpesa/get/all
 */
export async function listWallets(): Promise<unknown> {
  const token = await getAuthToken();
  const clientId = process.env.E2P_CLIENT_ID;

  const response = await fetch(`${E2P_BASE_URL}/v1/wallets/mpesa/get/all`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ client_id: clientId }),
  });

  if (!response.ok) {
    throw new Error(`Erro ao listar carteiras: ${response.status}`);
  }

  return response.json();
}

/**
 * 4. Histórico de pagamentos recebidos
 * POST https://e2payments.explicador.co.mz/v1/payments/mpesa/get/all
 */
export async function getPaymentHistory(): Promise<unknown> {
  const token = await getAuthToken();
  const clientId = process.env.E2P_CLIENT_ID;

  const response = await fetch(`${E2P_BASE_URL}/v1/payments/mpesa/get/all`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ client_id: clientId }),
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar histórico: ${response.status}`);
  }

  return response.json();
}
