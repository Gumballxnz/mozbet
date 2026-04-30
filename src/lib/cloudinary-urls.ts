// URLs das imagens hospedadas no Cloudinary CDN
// Gerado automaticamente por scripts/upload-to-cloudinary.mjs
// NÃO EDITAR MANUALMENTE — use o painel admin para trocar imagens

export const CLOUDINARY_URLS: Record<string, string> = {
  "/assets/banner-aviator.jpg": "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-aviator?_a=BAMAPqDh0",
  "/assets/banner-bottle-mania.jpg": "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-bottle-mania?_a=BAMAPqDh0",
  "/assets/banner-earplane.jpg": "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-earplane?_a=BAMAPqDh0",
  "/assets/banner-lion-zama.jpg": "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-lion-zama?_a=BAMAPqDh0",
  "/assets/banner-mega-fruits.jpg": "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-mega-fruits?_a=BAMAPqDh0",
  "/assets/banner-mines.jpg": "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-mines?_a=BAMAPqDh0",
  "/assets/banner-plinko.jpg": "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-plinko?_a=BAMAPqDh0",
  "/assets/banner-promo.jpg": "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-promo?_a=BAMAPqDh0",
  "/assets/banner-purple-crash.jpg": "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-purple-crash?_a=BAMAPqDh0",
  "/assets/banner-taxi.jpg": "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-taxi?_a=BAMAPqDh0",
  "/assets/game-aviator.jpg": "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/game-aviator?_a=BAMAPqDh0",
  "/assets/game-crash.jpg": "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/game-crash?_a=BAMAPqDh0",
  "/assets/game-dice.jpg": "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/game-dice?_a=BAMAPqDh0",
  "/assets/game-dragon.jpg": "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/game-dragon?_a=BAMAPqDh0",
  "/assets/game-keno.jpg": "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/game-keno?_a=BAMAPqDh0",
  "/assets/game-mines.jpg": "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/game-mines?_a=BAMAPqDh0",
  "/assets/game-plinko.jpg": "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/game-plinko?_a=BAMAPqDh0",
  "/assets/game-roulette.jpg": "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/game-roulette?_a=BAMAPqDh0",
  "/assets/game-tiger.jpg": "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/game-tiger?_a=BAMAPqDh0",
  "/assets/game-trading.jpg": "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/game-trading?_a=BAMAPqDh0"
};

// Helper para obter URL do Cloudinary ou fallback local
export function getAssetUrl(localPath: string): string {
  return CLOUDINARY_URLS[localPath] || localPath;
}
