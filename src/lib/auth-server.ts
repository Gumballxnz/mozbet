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
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET is not set in environment variables");
    }
    return "default-dev-secret-key-do-not-use-in-production-123456789";
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
