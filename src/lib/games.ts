// Catálogo de jogos MOZBET — URLs reais do Cloudinary
// O proxy /api/img/ continua funcional para o site público (GameCatalog.tsx)
// Este ficheiro serve como fallback quando a BD está vazia

const CDN = "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet";

export interface Game {
  id: string;
  name: string;
  category: string;
  banner: string;
  hot: boolean;
  pct: string;
}

export const GAMES: Game[] = [
  // Crash Games
  { id: "aviator", name: "AVIATOR", category: "crash", banner: `${CDN}/banner-aviator`, hot: true, pct: "97%" },
  { id: "taxi-crash", name: "TAXI CRASH", category: "crash", banner: `${CDN}/banner-taxi`, hot: true, pct: "96%" },
  { id: "earplane", name: "EARPLANE", category: "crash", banner: `${CDN}/banner-earplane`, hot: true, pct: "98%" },
  { id: "purple-crash", name: "CRASH", category: "crash", banner: `${CDN}/banner-purple-crash`, hot: false, pct: "97%" },
  { id: "subway-crash", name: "SUBWAY CRASH", category: "crash", banner: `${CDN}/game-crash`, hot: false, pct: "95%" },
  { id: "augustus-crash", name: "AUGUSTUS CRASH", category: "crash", banner: `${CDN}/game-dragon`, hot: false, pct: "96%" },
  { id: "chicken-highway", name: "CHICKEN HIGHWAY", category: "crash", banner: `${CDN}/game-keno`, hot: false, pct: "94%" },
  
  // Casino & Minigames
  { id: "mines", name: "MINES", category: "casino", banner: `${CDN}/banner-mines`, hot: true, pct: "98%" },
  { id: "plinko", name: "PLINKO777", category: "casino", banner: `${CDN}/banner-plinko`, hot: true, pct: "99%" },
  { id: "bottle-mania", name: "BOTTLE MANIA", category: "casino", banner: `${CDN}/banner-bottle-mania`, hot: false, pct: "99%" },
  { id: "fishinator", name: "FISHINATOR", category: "casino", banner: `${CDN}/game-trading`, hot: false, pct: "96%" },
  { id: "football-x", name: "FOOTBALL X", category: "casino", banner: `${CDN}/game-roulette`, hot: false, pct: "95%" },
  { id: "lion-zama", name: "LION ZAMA", category: "casino", banner: `${CDN}/banner-lion-zama`, hot: true, pct: "99%" },
  
  // Slots
  { id: "mega-fruits", name: "MEGA FRUITS", category: "slots", banner: `${CDN}/banner-mega-fruits`, hot: true, pct: "98%" },
];
