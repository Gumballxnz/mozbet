import { createClient } from "@supabase/supabase-js";
import { SignJWT, jwtVerify } from "jose";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "FATAL: JWT_SECRET não definido nas variáveis de ambiente. Configure JWT_SECRET no seu arquivo .env."
    );
  }
  return secret;
};

export async function signToken(payload: Record<string, unknown>, expiresInSeconds?: number) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + (expiresInSeconds || 60 * 60 * 24 * 7);

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
