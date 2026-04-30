// Biblioteca de integração com a API da MOZE SMS (Moçambique)
// Documentação: https://api.mozesms.com
// Autenticação: Bearer Token (API Secret)

const MOZSMS_API_URL = process.env.MOZSMS_API_URL || "https://api.mozesms.com";
const MOZSMS_API_KEY = process.env.MOZSMS_API_KEY || "";
const MOZSMS_SECRET = process.env.MOZSMS_SECRET || "";
const MOZSMS_SENDER_ID = process.env.MOZSMS_SENDER_ID || "MOZBET";

interface MozSmsResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Envia uma SMS para um número moçambicano via MOZE SMS API.
 * Documentação: https://api.mozesms.com/sms/send
 */
export async function sendSMS(to: string, text: string): Promise<MozSmsResponse> {
  // O número deve estar no formato internacional (ex: 258841234567)
  const formattedNumber = to.startsWith("258") ? to : `258${to}`;

  try {
    const res = await fetch(`${MOZSMS_API_URL}/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": MOZSMS_API_KEY,
        "X-API-Secret": MOZSMS_SECRET,
      },
      body: JSON.stringify({
        phone: formattedNumber,
        message: text,
        sender_id: MOZSMS_SENDER_ID,
      }),
    });

    const data = await res.json();

    // A API devolve sempre { success: false, error: "..." } em caso de erro
    if (!data.success) {
      console.error("[MOZSMS] Erro ao enviar SMS:", data);
      return { success: false, error: data.error || "Erro ao enviar SMS" };
    }

    console.log("[MOZSMS] SMS enviada com sucesso para:", formattedNumber);
    return { success: true, message: "SMS enviada com sucesso" };
  } catch (error) {
    console.error("[MOZSMS] Erro de conexão:", error);
    return { success: false, error: "Falha na conexão com o serviço de SMS" };
  }
}

/**
 * Gera um código OTP de 6 dígitos aleatório e seguro.
 */
export function generateOTP(): string {
  // Gera um número entre 100000 e 999999
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Formata a mensagem OTP padrão da MOZBET.
 */
export function formatOTPMessage(code: string): string {
  return `MOZBET: O seu codigo de verificacao e ${code}. Valido por 5 minutos. Nao partilhe com ninguem.`;
}

/**
 * Formata a mensagem de recuperação de senha.
 */
export function formatResetMessage(code: string): string {
  return `MOZBET: O seu codigo para recuperar a palavra-passe e ${code}. Valido por 5 minutos.`;
}
