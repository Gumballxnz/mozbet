import { NextResponse } from "next/server";

/**
 * Endpoint de diagnóstico temporário para testar a conexão com a e2Payments.
 * Testa: 1) Geração de token, 2) Listagem de carteiras
 * REMOVER APÓS CONFIRMAR QUE FUNCIONA.
 */
export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      hasClientId: !!process.env.E2P_CLIENT_ID,
      hasClientSecret: !!process.env.E2P_CLIENT_SECRET,
      hasWalletMpesa: !!process.env.E2P_WALLET_MPESA,
      hasWalletEmola: !!process.env.E2P_WALLET_EMOLA,
      clientIdPreview: process.env.E2P_CLIENT_ID?.substring(0, 8) + "...",
      walletMpesa: process.env.E2P_WALLET_MPESA,
      walletEmola: process.env.E2P_WALLET_EMOLA,
    },
  };

  // Teste 1: Gerar token
  const BASE_URL = "https://e2payments.explicador.co.mz";

  try {
    const tokenRes = await fetch(`${BASE_URL}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: process.env.E2P_CLIENT_ID,
        client_secret: process.env.E2P_CLIENT_SECRET,
      }),
    });

    const tokenBody = await tokenRes.text();
    results.tokenTest = {
      status: tokenRes.status,
      ok: tokenRes.ok,
      body: tokenBody.substring(0, 500),
    };

    // Teste 2: Se o token funcionou, testar listar carteiras
    if (tokenRes.ok) {
      try {
        const tokenData = JSON.parse(tokenBody);
        const token = tokenData.access_token;

        const walletsRes = await fetch(`${BASE_URL}/v1/wallets/mpesa/get/all`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ client_id: process.env.E2P_CLIENT_ID }),
        });

        const walletsBody = await walletsRes.text();
        results.walletsTest = {
          status: walletsRes.status,
          ok: walletsRes.ok,
          body: walletsBody.substring(0, 500),
        };
      } catch (e: unknown) {
        results.walletsTest = { error: String(e) };
      }
    }
  } catch (e: unknown) {
    results.tokenTest = { error: String(e), message: "Falha na conexão com a e2Payments" };
  }

  // Teste 3: Tentar URL alternativa (mpesaemolatech.com)
  const ALT_URL = "https://mpesaemolatech.com";
  try {
    const altRes = await fetch(`${ALT_URL}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: process.env.E2P_CLIENT_ID,
        client_secret: process.env.E2P_CLIENT_SECRET,
      }),
    });

    const altBody = await altRes.text();
    results.altUrlTest = {
      url: ALT_URL,
      status: altRes.status,
      ok: altRes.ok,
      body: altBody.substring(0, 500),
    };
  } catch (e: unknown) {
    results.altUrlTest = { url: ALT_URL, error: String(e) };
  }

  return NextResponse.json(results, { status: 200 });
}
