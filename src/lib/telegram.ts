interface TelegramResponse {
  success: boolean;
  error?: string;
}

export async function sendTelegramNotification(text: string): Promise<TelegramResponse> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return { success: false, error: "Telegram não configurado no .env" };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
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
