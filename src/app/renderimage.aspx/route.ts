import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bid = searchParams.get("bid") || "1";

    let svgBanner = "";

    // Banners dinâmicos estilizados premium baseados no Banner ID (bid)
    if (bid === "1723" || bid === "1") {
      // Banner 1: Aviator & Mines Promo
      svgBanner = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 300" width="100%" height="100%">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#020617;stop-opacity:1" />
            </linearGradient>
            <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#00FF7F;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#00b359;stop-opacity:1" />
            </linearGradient>
            <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#ff3333;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#b30000;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#bg)" rx="16" />
          
          <!-- Brilhos decorativos -->
          <circle cx="200" cy="150" r="250" fill="#00FF7F" opacity="0.04" filter="blur(80px)" />
          <circle cx="1000" cy="150" r="250" fill="#ff3333" opacity="0.04" filter="blur(80px)" />

          <!-- Linha superior de destaque -->
          <rect width="100%" height="6" fill="url(#primaryGrad)" />

          <!-- LOGO MOZBET -->
          <text x="80" y="100" font-family="'Plus Jakarta Sans', 'Segoe UI', sans-serif" font-weight="900" font-size="52" fill="#ffffff" letter-spacing="3">
            MOZ<tspan fill="url(#primaryGrad)">BET</tspan>
          </text>
          
          <!-- Slogan -->
          <text x="80" y="150" font-family="'Plus Jakarta Sans', 'Segoe UI', sans-serif" font-weight="700" font-size="28" fill="#cbd5e1">
            BÓNUS DE BOAS-VINDAS DE <tspan fill="#00FF7F" font-weight="800">500%</tspan>
          </text>
          
          <text x="80" y="210" font-family="'Plus Jakarta Sans', 'Segoe UI', sans-serif" font-weight="600" font-size="20" fill="#94a3b8">
            Joga Aviator, Mines, Slots e muito mais!
          </text>

          <!-- Botão CTA -->
          <rect x="80" y="235" width="220" height="42" rx="12" fill="url(#primaryGrad)" />
          <text x="190" y="262" font-family="'Plus Jakarta Sans', 'Segoe UI', sans-serif" font-weight="800" font-size="16" fill="#020617" text-anchor="middle">
            REGISTA-TE JÁ
          </text>

          <!-- Ilustração Aviator SVG -->
          <g transform="translate(800, 130) scale(1.8)">
            <!-- Avião decorativo -->
            <path d="M-60,-10 L-20,-10 L10,5 L30,5 L40,-5 L20,-20 L-30,-20 Z" fill="url(#redGrad)" />
            <path d="M-10,5 L-5,25 L10,25 L5,5 Z" fill="#ff6666" />
            <path d="M-40,-10 L-42,-25 L-30,-25 L-33,-10 Z" fill="#ff6666" />
            <!-- Hélice -->
            <ellipse cx="40" cy="-5" rx="3" ry="15" fill="#e2e8f0" />
            <!-- Rastro de fumaça -->
            <path d="M-60,-10 Q-100,-30 -160,-20 Q-200,-10 -250,-30" fill="none" stroke="#ff3333" stroke-width="4" stroke-linecap="round" opacity="0.3" stroke-dasharray="10, 5" />
          </g>
          
          <!-- Selo 18+ -->
          <circle cx="1120" cy="245" r="22" fill="none" stroke="#ff3333" stroke-width="3" />
          <text x="1120" y="251" font-family="sans-serif" font-weight="900" font-size="16" fill="#ff3333" text-anchor="middle">18+</text>
        </svg>
      `;
    } else {
      // Banner 2: Apostas Esportivas Promo (Geral)
      svgBanner = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 300" width="100%" height="100%">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#020617;stop-opacity:1" />
            </linearGradient>
            <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#00FF7F;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#00b359;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#bg)" rx="16" />
          <circle cx="200" cy="150" r="250" fill="#00FF7F" opacity="0.04" filter="blur(80px)" />
          <rect width="100%" height="6" fill="url(#primaryGrad)" />

          <!-- LOGO MOZBET -->
          <text x="80" y="100" font-family="'Plus Jakarta Sans', 'Segoe UI', sans-serif" font-weight="900" font-size="52" fill="#ffffff" letter-spacing="3">
            MOZ<tspan fill="url(#primaryGrad)">BET</tspan>
          </text>
          
          <!-- Destaque Esportes -->
          <text x="80" y="150" font-family="'Plus Jakarta Sans', 'Segoe UI', sans-serif" font-weight="700" font-size="28" fill="#cbd5e1">
            AS MELHORES PROPORÇÕES DE APOSTAS
          </text>
          
          <text x="80" y="210" font-family="'Plus Jakarta Sans', 'Segoe UI', sans-serif" font-weight="600" font-size="20" fill="#94a3b8">
            Levantamentos instantâneos via M-Pesa &amp; e-Mola!
          </text>

          <!-- Botão CTA -->
          <rect x="80" y="235" width="220" height="42" rx="12" fill="url(#primaryGrad)" />
          <text x="190" y="262" font-family="'Plus Jakarta Sans', 'Segoe UI', sans-serif" font-weight="800" font-size="16" fill="#020617" text-anchor="middle">
            APOSTAR AGORA
          </text>

          <!-- Ícone de Bola de Futebol Decorativo -->
          <g transform="translate(900, 150) scale(1.6)" opacity="0.75">
            <circle cx="0" cy="0" r="60" fill="#ffffff" stroke="#1e293b" stroke-width="4" />
            <!-- Gomos da bola -->
            <polygon points="0,-20 17,-8 10,12 -10,12 -17,-8" fill="#1e293b" />
            <path d="M0,-20 L0,-60 M17,-8 L51,-24 M10,12 L35,48 M-10,12 L-35,48 M-17,-8 L-51,-24" stroke="#1e293b" stroke-width="4" />
            <polygon points="0,-60 15,-55 25,-40" fill="#1e293b" opacity="0.2" />
          </g>
          
          <!-- Selo 18+ -->
          <circle cx="1120" cy="245" r="22" fill="none" stroke="#ff3333" stroke-width="3" />
          <text x="1120" y="251" font-family="sans-serif" font-weight="900" font-size="16" fill="#ff3333" text-anchor="middle">18+</text>
        </svg>
      `;
    }

    return new NextResponse(svgBanner, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400" // Cache de 1 dia para performance
      }
    });
  } catch (error) {
    console.error("Erro ao renderizar banner promocional:", error);
    return new NextResponse("Erro ao renderizar imagem.", { status: 500 });
  }
}
