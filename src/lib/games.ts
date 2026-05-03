// Catálogo de jogos MOZBET — URLs reais do Oracle Object Storage
// Este ficheiro serve como fallback quando a BD está vazia

const ORACLE_GAMES = "https://objectstorage.ca-montreal-1.oraclecloud.com/n/ax44xafhjvwf/b/mozbet-assets/o/games/";
const ORACLE_BANNERS = "https://objectstorage.ca-montreal-1.oraclecloud.com/n/ax44xafhjvwf/b/mozbet-assets/o/banners/";

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
  { id: "aviator", name: "AVIATOR", category: "crash", banner: `${ORACLE_GAMES}aviator-1777748654455.webp`, hot: true, pct: "97%" },
  { id: "taxi-crash", name: "TAXI CRASH", category: "crash", banner: `${ORACLE_BANNERS}o-taxi-da--1777746463559.webp`, hot: true, pct: "96%" },
  
  // Casino & Minigames
  { id: "mines", name: "MINES", category: "casino", banner: `${ORACLE_GAMES}mines-1777748656308.webp`, hot: true, pct: "98%" },
  { id: "lion-zama", name: "LION ZAMA", category: "casino", banner: `${ORACLE_GAMES}lion-zama.webp`, hot: true, pct: "99%" },
  
  // Slots
  { id: "mega-fruits", name: "MEGA FRUITS", category: "slots", banner: `${ORACLE_GAMES}mega-fruits.webp`, hot: true, pct: "98%" },
];
