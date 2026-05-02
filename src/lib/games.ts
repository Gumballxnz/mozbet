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
  { id: "earplane", name: "EARPLANE", category: "crash", banner: `${ORACLE_BANNERS}voe-com-o--1777746459592.webp`, hot: true, pct: "98%" },
  { id: "purple-crash", name: "CRASH", category: "crash", banner: `${ORACLE_BANNERS}explos-o-de--1777746460930.webp`, hot: false, pct: "97%" },
  { id: "subway-crash", name: "SUBWAY CRASH", category: "crash", banner: `${ORACLE_BANNERS}a-bola-da--1777746462283.webp`, hot: false, pct: "95%" },
  { id: "augustus-crash", name: "AUGUSTUS CRASH", category: "crash", banner: `${ORACLE_GAMES}augustus-crash.webp`, hot: false, pct: "96%" },
  { id: "chicken-highway", name: "CHICKEN HIGHWAY", category: "crash", banner: `${ORACLE_GAMES}chicken-highway.webp`, hot: false, pct: "94%" },
  
  // Casino & Minigames
  { id: "mines", name: "MINES", category: "casino", banner: `${ORACLE_GAMES}mines-1777748656308.webp`, hot: true, pct: "98%" },
  { id: "plinko", name: "PLINKO777", category: "casino", banner: `${ORACLE_GAMES}plinko-1777748655450.webp`, hot: true, pct: "99%" },
  { id: "bottle-mania", name: "BOTTLE MANIA", category: "casino", banner: `${ORACLE_GAMES}bottle-mania.webp`, hot: false, pct: "99%" },
  { id: "fishinator", name: "FISHINATOR", category: "casino", banner: `${ORACLE_GAMES}fishinator.webp`, hot: false, pct: "96%" },
  { id: "football-x", name: "FOOTBALL X", category: "casino", banner: `${ORACLE_GAMES}football-x.webp`, hot: false, pct: "95%" },
  { id: "lion-zama", name: "LION ZAMA", category: "casino", banner: `${ORACLE_GAMES}lion-zama.webp`, hot: true, pct: "99%" },
  
  // Slots
  { id: "mega-fruits", name: "MEGA FRUITS", category: "slots", banner: `${ORACLE_GAMES}mega-fruits.webp`, hot: true, pct: "98%" },
];
