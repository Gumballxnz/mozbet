import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/auth-server";
import { forceApproveDeposit } from "@/app/admin/transactions/actions";

const E2P_BASE_URL = "https://mpesaemolatech.com";
let cachedToken: string | null = null;
let tokenExpiryTime = 0;

async function getE2PToken() {
  if (cachedToken && Date.now() < tokenExpiryTime) return cachedToken;
  const clientId = process.env.E2P_CLIENT_ID;
  const clientSecret = process.env.E2P_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Credenciais e2Payments não configuradas.");

  const response = await fetch(`${E2P_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": "https://mozbet.online" },
    body: JSON.stringify({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
  });
  if (!response.ok) throw new Error("Falha na autenticação e2Payments");
  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiryTime = Date.now() + (data.expires_in - 300) * 1000;
  return cachedToken;
}

export async function GET(req: Request) {
  try {
    // Apenas para forçar dynamic route
    const { searchParams } = new URL(req.url);
    const txId = searchParams.get('txId');

    // Se o frontend quiser sincronizar um específico ou tudo
    let pendingQuery = supabaseAdmin.from("transactions").select("id, status, created_at").eq("type", "DEPOSIT").eq("status", "PENDING");
    if (txId) {
      pendingQuery = pendingQuery.eq("id", txId);
    } else {
      pendingQuery = pendingQuery.order('created_at', { ascending: false }).limit(20);
    }

    const { data: pendingTxs } = await pendingQuery;

    if (!pendingTxs || pendingTxs.length === 0) {
      return NextResponse.json({ message: "Sem transações pendentes", count: 0 });
    }

    // 1. Obter histórico e2payments
    const token = await getE2PToken();
    const clientId = process.env.E2P_CLIENT_ID;

    // Pedimos os últimos 30 pagamentos (deve cobrir os últimos minutos)
    const histRes = await fetch(`${E2P_BASE_URL}/v1/payments/mpesa/get/all/paginate/30`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "Origin": "https://mozbet.online" },
      body: JSON.stringify({ client_id: clientId }),
    });

    if (!histRes.ok) return NextResponse.json({ error: "Erro e2payments fetch" }, { status: 500 });
    const histData = await histRes.json();
    const payments = histData.data || [];

    let processedCount = 0;
    const now = new Date();

    for (const tx of pendingTxs) {
      const shortId = tx.id.substring(0, 8);
      const e2pRecord = payments.find((p: any) => p.reference && p.reference.includes(shortId));

      if (e2pRecord) {
        if (e2pRecord.status === "Success") {
          // Aprovar depósito usando a função segura!
          await forceApproveDeposit(tx.id);
          processedCount++;
        } else if (e2pRecord.status === "Error" || e2pRecord.status === "Failed") {
          // Marcar como falhado
          await supabaseAdmin.from("transactions").update({ status: "FAILED" }).eq("id", tx.id);
        }
      } else {
        // Se não encontrou, verificar se já passaram mais de 15 minutos (timeout)
        const txDate = new Date(tx.created_at);
        const diffMinutes = (now.getTime() - txDate.getTime()) / (1000 * 60);
        if (diffMinutes > 15) {
          await supabaseAdmin.from("transactions").update({ status: "FAILED" }).eq("id", tx.id);
        }
      }
    }

    return NextResponse.json({ success: true, processed: processedCount });

  } catch (error: any) {
    console.error("[Sync Endpoint] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
