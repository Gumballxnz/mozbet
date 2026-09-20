export type E2PaymentMethod = "mpesa" | "emola";

const E2PAY_BASE_URL = process.env.E2PAY_BASE_URL || "https://mpesaemolatech.com";
const E2PAY_TOKEN_URL = `${E2PAY_BASE_URL}/oauth/token`;

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getE2PayToken(): Promise<string> {

  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const clientId = process.env.E2PAY_CLIENT_ID;
  const clientSecret = process.env.E2PAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Credenciais E2Payments (E2PAY_CLIENT_ID / E2PAY_CLIENT_SECRET) não configuradas.");
  }

  console.log("[E2Payments] A gerar novo token de acesso...");

  const response = await fetch(E2PAY_TOKEN_URL, {
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
    console.error("[E2Payments] Erro ao gerar token:", errorText);
    throw new Error(`Falha ao autenticar na E2Payments (HTTP ${response.status})`);
  }

  const data = await response.json();

  if (!data.access_token) {
    console.error("[E2Payments] Resposta sem access_token:", data);
    throw new Error("Token de acesso não retornado pela E2Payments.");
  }

  cachedToken = `${data.token_type || "Bearer"} ${data.access_token}`;
  tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000;

  console.log("[E2Payments] Token gerado com sucesso. Válido por ~23h.");
  return cachedToken;
}

export async function processE2Payment(
  phone: string,
  amount: number,
  transactionId: string,
  method: E2PaymentMethod = "mpesa"
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const walletId = method === "emola"
      ? process.env.E2PAY_WALLET_EMOLA
      : process.env.E2PAY_WALLET_MPESA;

    const clientId = process.env.E2PAY_CLIENT_ID;

    if (!walletId || !clientId) {
      throw new Error("Credenciais E2Payments não configuradas (wallet ou client_id em falta).");
    }

    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("258")) {
      cleanPhone = cleanPhone.substring(3);
    }

    if (cleanPhone.length !== 9) {
      return { success: false, error: "Número de telefone inválido. Deve ter 9 dígitos." };
    }

    const token = await getE2PayToken();

    const paymentPath = method === "emola" ? "emola-payment" : "mpesa-payment";
    const endpoint = `${E2PAY_BASE_URL}/v1/c2b/${paymentPath}/${walletId}`;

    const payload = {
      client_id: clientId,
      amount: String(amount),
      phone: cleanPhone,
      reference: `MOZ${transactionId.split("-")[0]}`,
    };

    console.log(`[E2Payments] Iniciando pagamento C2B via ${method.toUpperCase()} | Transação=${transactionId} | Valor=${amount} MZN | Telefone=***${cleanPhone.slice(-3)}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": token,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (controller.signal.aborted) {
        console.error("[E2Payments] Timeout de 60s atingido.");
        return { success: false, error: "O pagamento demorou mais do que o esperado. Tente novamente." };
      }
      throw err;
    }

    const textData = await response.text();
    let data;
    try {
      data = JSON.parse(textData);
    } catch {
      console.error("[E2Payments] Resposta inválida (não JSON):", textData);
      return { success: false, error: `Erro no Gateway (HTTP ${response.status}): resposta inesperada.` };
    }

    if (!response.ok) {
      console.error(`[E2Payments] Erro na API (HTTP ${response.status}):`, data);
      return {
        success: false,
        error: data.message || data.error || `Pagamento rejeitado (HTTP ${response.status}).`,
      };
    }

    console.log(`[E2Payments] ✅ Pagamento processado com sucesso:`, data);
    return { success: true, data };

  } catch (error: any) {
    console.error("[E2Payments] Erro Exception:", error.message || error);
    return {
      success: false,
      error: "Serviço de pagamentos temporariamente indisponível. Tente novamente.",
    };
  }
}
