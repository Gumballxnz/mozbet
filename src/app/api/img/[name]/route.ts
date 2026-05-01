// Proxy de imagens — esconde a URL real do Cloudinary
// O frontend pede: /api/img/banner-aviator
// O servidor busca no Cloudinary e devolve a imagem diretamente
// O utilizador NUNCA vê o URL do Cloudinary no DevTools

import { NextRequest, NextResponse } from "next/server";

// Mapeamento de IDs para URLs do Cloudinary (server-side only)
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "dm3glrwax";

// Aliases para nomes que diferem no Cloudinary
const ASSET_ALIASES: Record<string, string> = {
  "banner-tiger": "game-tiger",
  "banner-vip": "banner-promo",
};

function buildCloudinaryUrl(assetName: string): string {
  const resolved = ASSET_ALIASES[assetName] || assetName;
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/${resolved}`;
}

// Cache em memória para evitar re-fetch constante (5 minutos)
const imageCache = new Map<string, { data: ArrayBuffer; contentType: string; cachedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  if (!name || !/^[a-z0-9-.]+$/i.test(name)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Verificar cache em memória
  const cached = imageCache.get(name);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return new NextResponse(cached.data, {
      status: 200,
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Cache": "HIT",
      },
    });
  }

  try {
    const cloudinaryUrlPrimary = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/${name}`;
    let response = await fetch(cloudinaryUrlPrimary, {
      next: { revalidate: 3600 },
    });

    // Se falhar, tenta o caminho com apenas uma pasta "mozbet"
    if (!response.ok) {
      const cloudinaryUrlSecondary = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/${name}`;
      response = await fetch(cloudinaryUrlSecondary, {
        next: { revalidate: 3600 },
      });
    }

    if (!response.ok) {
      return new NextResponse("Image not found", { status: 404 });
    }

    const data = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/webp";

    // Guardar no cache em memória
    imageCache.set(name, { data, contentType, cachedAt: Date.now() });

    // Limpar cache antigo (máx 50 entradas)
    if (imageCache.size > 50) {
      const oldest = [...imageCache.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt)[0];
      if (oldest) imageCache.delete(oldest[0]);
    }

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("Erro no proxy de imagem:", error);
    return new NextResponse("Server error", { status: 500 });
  }
}
