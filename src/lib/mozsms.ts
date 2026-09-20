const MOZSMS_API_URL = process.env.MOZSMS_API_URL || "https://api.mozesms.com/v4";
const MOZSMS_API_KEY = process.env.MOZSMS_API_KEY || "";
const MOZSMS_SECRET = process.env.MOZSMS_SECRET || "";
const MOZSMS_SENDER_ID = process.env.MOZSMS_SENDER_ID || "OTP";
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Plataforma";

interface MozSmsResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function sendSMS(to: string, text: string): Promise<MozSmsResponse> {
  if (!MOZSMS_API_KEY || !MOZSMS_SECRET) {
    console.error("[MOZSMS] Erro: MOZSMS_API_KEY ou MOZSMS_SECRET não configuradas no .env.");
    return { success: false, error: "Serviço de SMS não configurado." };
  }

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

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function formatOTPMessage(code: string): string {
  return `${APP_NAME}: O seu codigo de verificacao e ${code}. Valido por 5 minutos. Nao partilhe com ninguem.`;
}

export function formatResetMessage(code: string): string {
  return `${APP_NAME}: O seu codigo para recuperar a palavra-passe e ${code}. Valido por 5 minutos.`;
}
