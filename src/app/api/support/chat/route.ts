import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `Você é o assistente virtual oficial de suporte ao cliente da casa de apostas MOZBET em Moçambique.
Regras estritas que você deve seguir:
1. Seja sempre educado, prestativo e use um tom profissional, mas amigável.
2. Você pode falar Português ou Inglês, dependendo de como o usuário falar com você. O padrão é Português de Moçambique.
3. JAMAIS invente promoções, regras ou crie dados falsos. 
4. Sobre Depósitos: Aceitamos M-Pesa e E-Mola através da e2Payments. O depósito mínimo é de 10 MT e o máximo 25.000 MT. O número usado no registo tem de ser o mesmo usado no depósito.
5. Sobre Bônus: Oferecemos 500% no primeiro depósito até 25.000 MT. O saldo vai para a carteira de bônus e tem requisitos de aposta (wagering).
6. Sobre Jogos: Temos Crash Games (Aviator, etc), Casino (Mines, Plinko) e Slots.
7. Não responda a perguntas de programação, política ou coisas fora do escopo de uma casa de apostas.
8. Mantenha as respostas curtas e diretas.`;

// Respostas automáticas para quando a IA estiver offline
const AUTO_REPLIES: Record<string, string> = {
  deposito: "Para depositar, clique no botão 'Depositar' no topo da página. Aceitamos M-Pesa e E-Mola. O mínimo é 10 MT e o máximo 25.000 MT.",
  bonus: "Oferecemos 500% de bónus no seu primeiro depósito, até 25.000 MT! Basta fazer o seu primeiro depósito.",
  saque: "A função de saque estará disponível em breve. Fique atento às novidades!",
  jogo: "Temos Crash Games (Aviator, Taxi Crash), Casino (Mines, Plinko, Roleta) e Slots. Clique em qualquer jogo para experimentar!",
  ajuda: "Posso ajudar com: depósitos, bónus, jogos e questões sobre a sua conta. O que precisa?",
  conta: "Para gerir a sua conta, clique no ícone de perfil. Lá pode ver o seu saldo, histórico e dados pessoais.",
};

function getAutoReply(message: string): string | null {
  const msg = message.toLowerCase();
  if (msg.includes("deposit") || msg.includes("pagar") || msg.includes("mpesa") || msg.includes("m-pesa")) return AUTO_REPLIES.deposito;
  if (msg.includes("bonus") || msg.includes("bónus") || msg.includes("promoç")) return AUTO_REPLIES.bonus;
  if (msg.includes("saque") || msg.includes("levantar") || msg.includes("retirar")) return AUTO_REPLIES.saque;
  if (msg.includes("jogo") || msg.includes("slot") || msg.includes("crash") || msg.includes("aviator") || msg.includes("mines")) return AUTO_REPLIES.jogo;
  if (msg.includes("ajuda") || msg.includes("help") || msg.includes("como")) return AUTO_REPLIES.ajuda;
  if (msg.includes("conta") || msg.includes("perfil") || msg.includes("saldo")) return AUTO_REPLIES.conta;
  return null;
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
      const autoReply = getAutoReply(message) || "Olá! O nosso suporte por IA está temporariamente offline. Para ajuda imediata, envie um WhatsApp para +258 84 068 3435.";
      return NextResponse.json({ response: autoReply });
    }

    // Formatar histórico para a API REST do Gemini
    const formattedHistory = (history || []).map((msg: { role: string, content: string }) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
            { role: "model", parts: [{ text: "Entendido. Serei o assistente de suporte da MOZBET." }] },
            ...formattedHistory,
            { role: "user", parts: [{ text: message }] }
          ],
          generationConfig: {
            temperature: 0.2,
          }
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro da API Gemini:", data);
      // Fallback para respostas automáticas se a IA falhar
      const autoReply = getAutoReply(message) || "Desculpe, o nosso assistente está a processar muitos pedidos. Tente novamente em alguns segundos.";
      return NextResponse.json({ response: autoReply });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      const autoReply = getAutoReply(message) || "Desculpe, não consegui processar a sua pergunta. Pode reformular?";
      return NextResponse.json({ response: autoReply });
    }

    return NextResponse.json({ response: reply });

  } catch (error) {
    console.error("Erro no Gemini Chat:", error);
    return NextResponse.json({ 
      response: "O nosso suporte automático está temporariamente indisponível. Para ajuda, contacte-nos pelo WhatsApp: +258 84 068 3435." 
    });
  }
}

