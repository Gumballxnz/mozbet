// Biblioteca TOTP para autenticação de 2 fatores (Google Authenticator)
import * as OTPAuth from "otpauth";

/**
 * Gera um novo segredo TOTP para o utilizador configurar no Google Authenticator.
 * Retorna o segredo e a URI para gerar o QR Code.
 */
export function generateTOTPSecret(phone: string) {
  const totp = new OTPAuth.TOTP({
    issuer: "MOZBET",
    label: `Admin (+258${phone})`,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  });

  return {
    secret: totp.secret.base32,
    uri: totp.toString(), // URI para gerar QR Code
  };
}

/**
 * Verifica se um código TOTP de 6 dígitos é válido.
 * Permite uma janela de tolerância de 1 período (30s antes/depois).
 */
export function verifyTOTP(secret: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: "MOZBET",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  // window: 1 = aceita o código do período anterior e do próximo (tolerância de ±30s)
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}
