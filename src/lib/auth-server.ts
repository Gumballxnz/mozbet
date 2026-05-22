import { createClient } from "@supabase/supabase-js";
import { SignJWT, jwtVerify } from "jose"; // Usando 'jose' no Next.js pois 'jsonwebtoken' usa APIs do Node que quebram no Edge Runtime

// ==========================================
// CLIENTE SUPABASE BACKEND (ADMIN)
// ==========================================
// ATENÇÃO: NUNCA importe este arquivo em Client Components ("use client")!
// Isso usa o Service Role Key, que ignora o RLS e tem acesso total ao BD.

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key"
);

// ==========================================
// FUNÇÕES JWT E SESSÃO
// ==========================================

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // SEGURANÇA: Em produção, JWT_SECRET é OBRIGATÓRIO. Sem ele, tokens podem ser forjados.
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: JWT_SECRET não definido nas variáveis de ambiente. A aplicação não pode iniciar em produção sem esta chave.");
    }
    console.warn("⚠️ [SEGURANÇA] JWT_SECRET não definido. Usando chave de desenvolvimento. NÃO usar em produção!");
    return "dev-only-local-secret-" + Date.now().toString(36);
  }
  return secret;
};

export async function signToken(payload: Record<string, unknown>, expiresInSeconds?: number) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + (expiresInSeconds || 60 * 60 * 24 * 7); // Padrão: 7 dias

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(exp)
    .setIssuedAt(iat)
    .setNotBefore(iat)
    .sign(new TextEncoder().encode(getJwtSecretKey()));
}

export async function verifyToken<T = Record<string, unknown>>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(getJwtSecretKey())
    );
    return payload as unknown as T;
  } catch (error) {
    return null;
  }
}
