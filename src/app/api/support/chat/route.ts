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
9. Se o usuário disser "ola", "olá", "oi", "hi", "hello" ou qualquer saudação, responda com uma saudação calorosa e pergunte como pode ajudar.`;

// Respostas automáticas inteligentes (fallback quando a IA falha)
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
  
  // Saudações
  if (/^(ol[aá]|oi|hi|hello|hey|bom dia|boa tarde|boa noite|e a[ií]|salve|tudo bem)/.test(msg)) return AUTO_REPLIES.saudacao;
  
  // Categorias
  if (msg.includes("deposit") || msg.includes("pagar") || msg.includes("mpesa") || msg.includes("m-pesa") || msg.includes("e-mola") || msg.includes("emola")) return AUTO_REPLIES.deposito;
  if (msg.includes("bonus") || msg.includes("bónus") || msg.includes("promoç")) return AUTO_REPLIES.bonus;
  if (msg.includes("saque") || msg.includes("levantar") || msg.includes("retirar") || msg.includes("withdraw")) return AUTO_REPLIES.saque;
  if (msg.includes("jogo") || msg.includes("slot") || msg.includes("crash") || msg.includes("aviator") || msg.includes("mines") || msg.includes("plinko")) return AUTO_REPLIES.jogo;
  if (msg.includes("ajuda") || msg.includes("help") || msg.includes("como")) return AUTO_REPLIES.ajuda;
  if (msg.includes("conta") || msg.includes("perfil") || msg.includes("saldo") || msg.includes("senha") || msg.includes("password")) return AUTO_REPLIES.conta;
  
  // Fallback genérico
  return "Olá! 👋 Sou o assistente da MOZBET. Posso ajudar com depósitos, bónus, jogos e questões da sua conta. Em que posso ajudar?";
}

// Modelos Gemini ordenados por prioridade (do mais rápido ao mais estável)
const GEMINI_MODELS = [
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

async function callGemini(apiKey: string, contents: any[], modelIndex = 0): Promise<string | null> {
  if (modelIndex >= GEMINI_MODELS.length) return null;
  
  const model = GEMINI_MODELS[modelIndex];
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 segundos de timeout
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 256,
          },
        }),
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeout);
    
    // Se deu 429 (rate limit) ou 503 (serviço indisponível), tenta o próximo modelo
    if (response.status === 429 || response.status === 503) {
      console.warn(`[Suporte IA] Modelo ${model} retornou ${response.status}, tentando próximo...`);
      return callGemini(apiKey, contents, modelIndex + 1);
    }
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error(`[Suporte IA] Erro ${response.status} no modelo ${model}:`, errData);
      return callGemini(apiKey, contents, modelIndex + 1);
    }
    
    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!reply) {
      console.warn(`[Suporte IA] Modelo ${model} não retornou conteúdo, tentando próximo...`);
      return callGemini(apiKey, contents, modelIndex + 1);
    }
    
    return reply;
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.warn(`[Suporte IA] Timeout no modelo ${model}, tentando próximo...`);
    } else {
      console.error(`[Suporte IA] Erro no modelo ${model}:`, err.message);
    }
    return callGemini(apiKey, contents, modelIndex + 1);
  }
}

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Se não tem chave, usar respostas automáticas
    if (!apiKey || apiKey === "sua-chave-api-do-google-gemini-aqui") {
      return NextResponse.json({ response: getAutoReply(message) });
    }

    // Formatar histórico para a API REST do Gemini
    const formattedHistory = (history || []).slice(-6).map((msg: { role: string, content: string }) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const contents = [
      { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
      { role: "model", parts: [{ text: "Entendido. Sou o assistente de suporte da MOZBET. Estou pronto para ajudar!" }] },
      ...formattedHistory,
      { role: "user", parts: [{ text: message }] },
    ];

    // Tentar obter resposta da IA com retry automático entre modelos
    const reply = await callGemini(apiKey, contents);

    if (reply) {
      return NextResponse.json({ response: reply });
    }

    // Se todos os modelos falharam, usar resposta automática inteligente
    return NextResponse.json({ response: getAutoReply(message) });

  } catch (error) {
    console.error("[Suporte IA] Erro geral:", error);
    return NextResponse.json({ response: getAutoReply("ajuda") });
  }
}
