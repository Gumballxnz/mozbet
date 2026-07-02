/**
 * Utilitário de integração com a API do Telegram para envio de notificações serverless.
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

interface TelegramResponse {
  success: boolean;
  error?: string;
}

/**
 * Envia uma mensagem de notificação para o Telegram configurado.
 * @param text Conteúdo da mensagem (Suporta Markdown ou HTML)
 */
export async function sendTelegramNotification(text: string): Promise<TelegramResponse> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("[Telegram] Configurações de Token ou Chat ID em falta.");
    return { success: false, error: "Configurações em falta" };
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();

    if (!data.ok) {
      console.error("[Telegram] Erro na API do Telegram:", data);
      return { success: false, error: data.description || "Erro desconhecido" };
    }

    return { success: true };
  } catch (error) {
    console.error("[Telegram] Falha ao enviar notificação:", error);
    return { success: false, error: "Erro de conexão" };
  }
}
