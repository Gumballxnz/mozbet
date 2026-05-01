// API: Enviar mensagem para o Chat Global
// POST /api/chat/message — { message }

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyToken } from "@/lib/auth-server";

// Cache simples para rate limiting (IP / User)
const rateLimitCache = new Map<string, number>();

// Filtro de palavras ofensivas (pode ser expandido no BD depois)
const BANNED_WORDS = ["burla", "roubo", "ladrão", "foda", "puta", "scam"];

function isMessageSafe(msg: string): boolean {
  const lowerMsg = msg.toLowerCase();
  return !BANNED_WORDS.some(word => lowerMsg.includes(word));
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticação
    const token = req.cookies.get("mozbet_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Faça login para participar no chat" }, { status: 401 });
    }

    const payload = await verifyToken<{ id: string; phone: string }>(token);
    if (!payload?.id) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    // 2. Rate Limiting (Máx 1 mensagem a cada 3 segundos)
    const now = Date.now();
    const lastMsgTime = rateLimitCache.get(payload.id);
    if (lastMsgTime && now - lastMsgTime < 3000) {
      return NextResponse.json({ error: "Escreva mais devagar (aguarde 3 segundos)" }, { status: 429 });
    }
    rateLimitCache.set(payload.id, now);
    
    // Limpar cache para evitar vazamento de memória (máx 1000 entradas)
    if (rateLimitCache.size > 1000) {
      rateLimitCache.clear();
    }

    const { message } = await req.json();

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "A mensagem não pode estar vazia" }, { status: 400 });
    }

    if (message.length > 150) {
      return NextResponse.json({ error: "A mensagem excede o limite de 150 caracteres" }, { status: 400 });
    }

    // 3. Filtro de palavras proibidas
    if (!isMessageSafe(message)) {
      return NextResponse.json({ error: "A tua mensagem viola as regras da comunidade" }, { status: 400 });
    }

    // 4. Mascarar o nome do utilizador: Mostrar os primeiros 8 caracteres do ID
    const maskedName = payload.id.split("-")[0].toUpperCase();

    // 5. Guardar na BD (o Supabase Realtime vai transmitir para todos os clientes conectados)
    const { data, error } = await supabaseAdmin
      .from("chat_messages")
      .insert({
        user_id: payload.id,
        username: maskedName,
        message: message.trim(),
        type: "message",
      })
      .select()
      .single();

    if (error) {
      console.error("Erro BD:", error);
      return NextResponse.json({ error: "Erro ao enviar mensagem" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: data });
  } catch (error) {
    console.error("Erro no chat:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
