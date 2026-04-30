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

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "sua-chave-api-do-google-gemini-aqui") {
      return NextResponse.json({ 
        response: "A nossa inteligência artificial está temporariamente offline para manutenção. Por favor, tente novamente mais tarde." 
      });
    }

    // Formatar histórico para a API REST do Gemini
    const formattedHistory = (history || []).map((msg: { role: string, content: string }) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
      throw new Error(data.error?.message || "Erro desconhecido da Google");
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      throw new Error("Resposta vazia da API");
    }

    return NextResponse.json({ response: reply });

  } catch (error) {
    console.error("Erro no Gemini Chat:", error);
    return NextResponse.json({ 
      error: "Desculpe, ocorreu um erro no sistema de suporte. Tente novamente." 
    }, { status: 500 });
  }
}
