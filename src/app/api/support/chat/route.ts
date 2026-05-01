import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `Você é o assistente virtual oficial de suporte ao cliente da casa de apostas MOZBET em Moçambique.
Regras estritas que você deve seguir:
1. Seja sempre educado, prestativo e use um tom profissional, mas amigável.
2. Você pode falar Português ou Inglês, dependendo de como o usuário falar com você. O padrão é Português de Moçambique.
3. JAMAIS invente promoções, regras ou crie dados falsos. 
4. Sobre Depósitos: Aceitamos M-Pesa e E-Mola através da e2Payments. O depósito mínimo é de 10 MT e o máximo 25.000 MT. O número usado no registo tem de ser o mesmo usado no depósito.
5. Sobre Bônus: Oferecemos 500% no primeiro depósito até 25.000 MT. O saldo vai para a carteira de bônus e tem requisitos de aposta (wagering).
6. Sobre Jogos: Temos Crash Games (Aviator, Taxi Crash, Earplane), Casino (Mines, Plinko, Roleta) e Slots.
7. Não responda a perguntas de programação, política ou coisas fora do escopo de uma casa de apostas.
8. Mantenha as respostas curtas e diretas (máximo 2-3 frases).
9. Se o usuário disser "ola", "olá", "oi", "hi", "hello" ou qualquer saudação, responda com uma saudação calorosa e pergunte como pode ajudar.
10. Você é a MOZBET, a melhor plataforma de apostas de Moçambique. Nunca diga que não sabe de que plataforma o usuário fala.`;

// Respostas automáticas inteligentes (fallback final)
const AUTO_REPLIES: Record<string, string> = {
  saudacao: "Olá! 👋 Bem-vindo ao suporte da MOZBET. Como posso ajudar-te hoje?",
  deposito: "Para depositar, clique no botão 'Depositar' no topo da página. Aceitamos M-Pesa e E-Mola. O mínimo é 10 MT e o máximo 25.000 MT.",
  bonus: "Oferecemos 500% de bónus no seu primeiro depósito, até 25.000 MT! Basta fazer o seu primeiro depósito.",
  saque: "A função de saque estará disponível em breve. Fique atento às novidades!",
  jogo: "Temos Crash Games (Aviator, Taxi Crash), Casino (Mines, Plinko, Roleta) e Slots. Clique em qualquer jogo para experimentar!",
  ajuda: "Posso ajudar com: depósitos, bónus, jogos e questões sobre a sua conta. O que precisa?",
  conta: "Para gerir a sua conta, clique no ícone de perfil. Lá pode ver o seu saldo, histórico e dados pessoais.",
};

function getAutoReply(message: string): string {
  const msg = message.toLowerCase().trim();
  if (/^(ol[aá]|oi|hi|hello|hey|bom dia|boa tarde|boa noite|e a[ií]|salve|tudo bem)/.test(msg)) return AUTO_REPLIES.saudacao;
  if (msg.includes("deposit") || msg.includes("pagar") || msg.includes("mpesa") || msg.includes("m-pesa") || msg.includes("e-mola")) return AUTO_REPLIES.deposito;
  if (msg.includes("bonus") || msg.includes("bónus") || msg.includes("promoç")) return AUTO_REPLIES.bonus;
  if (msg.includes("saque") || msg.includes("levantar") || msg.includes("retirar")) return AUTO_REPLIES.saque;
  if (msg.includes("jogo") || msg.includes("slot") || msg.includes("crash") || msg.includes("aviator") || msg.includes("mines")) return AUTO_REPLIES.jogo;
  if (msg.includes("ajuda") || msg.includes("help") || msg.includes("como")) return AUTO_REPLIES.ajuda;
  if (msg.includes("conta") || msg.includes("perfil") || msg.includes("saldo")) return AUTO_REPLIES.conta;
  return "Olá! 👋 Sou o assistente da MOZBET. Posso ajudar com depósitos, bónus, jogos e questões da sua conta. Em que posso ajudar?";
}

// Modelos a tentar, em ordem de prioridade
const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
];

async function tryGemini(apiKey: string, contents: any[], modelIdx = 0): Promise<string | null> {
  if (modelIdx >= MODELS.length) return null;

  const model = MODELS[modelIdx];

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 400,
            // Desativar o "thinking" interno do 2.5-flash para respostas rápidas
            ...(model.includes("2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          },
        }),
        signal: ctrl.signal,
      }
    );

    clearTimeout(timer);

    if (res.status === 429 || res.status === 503) {
      console.warn(`[Suporte] ${model} → ${res.status}, a tentar próximo modelo...`);
      return tryGemini(apiKey, contents, modelIdx + 1);
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(`[Suporte] ${model} → erro ${res.status}:`, JSON.stringify(err).slice(0, 200));
      return tryGemini(apiKey, contents, modelIdx + 1);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.warn(`[Suporte] ${model} → resposta vazia, a tentar próximo...`);
      return tryGemini(apiKey, contents, modelIdx + 1);
    }

    return text;
  } catch (e: any) {
    console.warn(`[Suporte] ${model} → ${e.name === "AbortError" ? "timeout" : e.message}`);
    return tryGemini(apiKey, contents, modelIdx + 1);
  }
}

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Sem chave → respostas automáticas
    if (!apiKey || apiKey === "sua-chave-api-do-google-gemini-aqui") {
      return NextResponse.json({ response: getAutoReply(message) });
    }

    // Montar histórico (últimas 6 mensagens para poupar tokens)
    const hist = (history || []).slice(-6).map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const contents = [
      { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
      { role: "model", parts: [{ text: "Entendido! Sou o assistente da MOZBET. Estou pronto para ajudar os nossos jogadores." }] },
      ...hist,
      { role: "user", parts: [{ text: message }] },
    ];

    const reply = await tryGemini(apiKey, contents);

    if (reply) {
      return NextResponse.json({ response: reply });
    }

    // Fallback final — nunca falha
    return NextResponse.json({ response: getAutoReply(message) });
  } catch (error) {
    console.error("[Suporte] Erro geral:", error);
    return NextResponse.json({ response: getAutoReply("ajuda") });
  }
}
