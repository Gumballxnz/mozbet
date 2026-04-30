/**
 * MOZBET - Módulo de Integração e2Payments (M-Pesa / E-Mola)
 * 
 * Implementação segura que RODA APENAS NO SERVIDOR.
 * Nenhuma credencial é exposta ao utilizador.
 */

const E2P_API_BASE = "https://api.e2payments.com/v1"; // URL base oficial (pode ser ajustada na sexta-feira se eles derem outra)

interface E2PTokenResponse {
  access_token: string;
  expires_in: number;
}

// Em Next.js Edge ou Node, podemos fazer um pequeno cache na memória
let cachedToken: string | null = null;
let tokenExpiryTime: number = 0;

/**
 * 1. Obter o Token de Autenticação da e2Payments (OAuth2)
 */
async function getAuthToken(): Promise<string> {
  // Se o token ainda for válido, reutilizamos para evitar spam na API deles
  if (cachedToken && Date.now() < tokenExpiryTime) {
    return cachedToken;
  }

  const clientId = process.env.E2P_CLIENT_ID;
  const clientSecret = process.env.E2P_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Credenciais e2Payments não configuradas no .env.local");
  }

  try {
    const response = await fetch(`${E2P_API_BASE}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
    });

    if (!response.ok) {
      throw new Error("Falha na autenticação da e2Payments");
    }

    const data: E2PTokenResponse = await response.json();
    
    cachedToken = data.access_token;
    // Salvar o tempo de expiração subtraindo 1 minuto por margem de segurança
    tokenExpiryTime = Date.now() + (data.expires_in - 60) * 1000;

    return data.access_token;
  } catch (error) {
    console.error("Erro no getAuthToken:", error);
    throw error;
  }
}

/**
 * 2. Iniciar um Pagamento (Depósito - C2B)
 * Esta função envia o PUSH (USSD) diretamente para o telefone do cliente.
 */
export async function initiateC2BPayment(phone: string, amount: number, reference: string) {
  try {
    const token = await getAuthToken();
    const walletId = process.env.E2P_WALLET_ID;

    // A API pede os telefones no formato nacional de Moçambique: 84xxxxxxx
    const cleanPhone = phone.replace("+258", "");

    const response = await fetch(`${E2P_API_BASE}/c2b/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        wallet_id: walletId,
        amount: amount,
        customer_msisdn: cleanPhone,
        reference: reference, // Nosso ID de transação para identificar quando o dinheiro cair
        // callback_url: "https://mozbet.online/api/payments/callback" // Fase 8
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Erro na e2Payments:", errorData);
      throw new Error("Erro ao processar pagamento na e2Payments");
    }

    const data = await response.json();
    return { success: true, data };
    
  } catch (error) {
    console.error("Erro C2B Payment:", error);
    return { success: false, error: "Serviço de pagamentos temporariamente indisponível." };
  }
}
