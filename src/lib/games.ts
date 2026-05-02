// Catálogo de jogos MOZBET — URLs reais do Cloudinary
// O proxy /api/img/ continua funcional para o site público (GameCatalog.tsx)
// Este ficheiro serve como fallback quando a BD está vazia

const ORACLE_BASE = "https://objectstorage.ca-montreal-1.oraclecloud.com/n/ax44xafhjvwf/b/mozbet-assets/o/banners/";

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
  { id: "aviator", name: "AVIATOR", category: "crash", banner: `${ORACLE_BASE}banner-aviator-1777748647754.webp`, hot: true, pct: "97%" },
  { id: "taxi-crash", name: "TAXI CRASH", category: "crash", banner: `${ORACLE_BASE}banner-taxi-1777748647754.webp`, hot: true, pct: "96%" },
  { id: "earplane", name: "EARPLANE", category: "crash", banner: `${ORACLE_BASE}banner-earplane-1777748647754.webp`, hot: true, pct: "98%" },
  { id: "purple-crash", name: "CRASH", category: "crash", banner: `${ORACLE_BASE}banner-purple-crash-1777748647754.webp`, hot: false, pct: "97%" },
  { id: "subway-crash", name: "SUBWAY CRASH", category: "crash", banner: `${ORACLE_BASE}banner-taxi-1777748647754.webp`, hot: false, pct: "95%" },
  { id: "augustus-crash", name: "AUGUSTUS CRASH", category: "crash", banner: `${ORACLE_BASE}banner-dragon-1777748647754.webp`, hot: false, pct: "96%" },
  { id: "chicken-highway", name: "CHICKEN HIGHWAY", category: "crash", banner: `${ORACLE_BASE}banner-keno-1777748647754.webp`, hot: false, pct: "94%" },
  
  // Casino & Minigames
  { id: "mines", name: "MINES", category: "casino", banner: `${ORACLE_BASE}mines-1777748649678.webp`, hot: true, pct: "98%" },
  { id: "plinko", name: "PLINKO777", category: "casino", banner: `${ORACLE_BASE}plinko-1777748648733.webp`, hot: true, pct: "99%" },
  { id: "bottle-mania", name: "BOTTLE MANIA", category: "casino", banner: `${ORACLE_BASE}banner-bottle-mania-1777748647754.webp`, hot: false, pct: "99%" },
  { id: "fishinator", name: "FISHINATOR", category: "casino", banner: `${ORACLE_BASE}banner-trading-1777748647754.webp`, hot: false, pct: "96%" },
  { id: "football-x", name: "FOOTBALL X", category: "casino", banner: `${ORACLE_BASE}banner-roulette-1777748647754.webp`, hot: false, pct: "95%" },
  { id: "lion-zama", name: "LION ZAMA", category: "casino", banner: `${ORACLE_BASE}banner-lion-zama-1777748647754.webp`, hot: true, pct: "99%" },
  
  // Slots
  { id: "mega-fruits", name: "MEGA FRUITS", category: "slots", banner: `${ORACLE_BASE}banner-mega-fruits-1777748647754.webp`, hot: true, pct: "98%" },
];
