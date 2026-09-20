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

  { id: "aviator", name: "AVIATOR", category: "crash", banner: `${ORACLE_GAMES}aviator-1777831898147.png`, hot: true, pct: "97%" },
  { id: "taxi-crash", name: "TAXI CRASH", category: "crash", banner: `${ORACLE_BANNERS}o-taxi-da--1777746463559.webp`, hot: true, pct: "96%" },
  { id: "earplane", name: "EARPLANE", category: "crash", banner: `${ORACLE_GAMES}earplane-1777832111004.png`, hot: true, pct: "98%" },
  { id: "purple-crash", name: "CRASH", category: "crash", banner: `${ORACLE_GAMES}purple-crash-1777832045193.png`, hot: false, pct: "97%" },
  { id: "subway-crash", name: "SUBWAY FORTUNES", category: "crash", banner: `${ORACLE_GAMES}subway-crash-1777832527247.png`, hot: false, pct: "95%" },
  { id: "augustus-crash", name: "AUGUSTUS CRASH", category: "crash", banner: `${ORACLE_GAMES}augustus-crash-1777831834118.png`, hot: false, pct: "96%" },
  { id: "chicken-highway", name: "CHICKEN HIGHWAY", category: "crash", banner: `${ORACLE_GAMES}chicken-highway-1777831983595.png`, hot: false, pct: "94%" },
  { id: "space-crash", name: "SPACE CRASH", category: "crash", banner: `${ORACLE_GAMES}space-crash-1777832449101.png`, hot: true, pct: "99%" },

  { id: "mines", name: "MINES", category: "casino", banner: `${ORACLE_GAMES}mines-1777832325124.png`, hot: true, pct: "98%" },
  { id: "plinko", name: "PLINKO777", category: "casino", banner: `${ORACLE_GAMES}plinko-1777832372729.png`, hot: true, pct: "99%" },
  { id: "bottle-mania", name: "BATTLE MANIA", category: "casino", banner: `${ORACLE_GAMES}bottle-mania-1777831941174.png`, hot: false, pct: "99%" },
  { id: "fishinator", name: "FISHINATOR", category: "casino", banner: `${ORACLE_GAMES}fishinator-1777832153235.png`, hot: false, pct: "96%" },
  { id: "football-x", name: "FOOTBALL X", category: "casino", banner: `${ORACLE_GAMES}football-x-1777832196558.png`, hot: false, pct: "95%" },
  { id: "lion-zama", name: "LION ZAMA", category: "casino", banner: `${ORACLE_GAMES}lion-zama.webp`, hot: true, pct: "99%" },

  { id: "mega-fruits", name: "MEGA FRUITS", category: "slots", banner: `${ORACLE_GAMES}mega-fruits-1777832261345.png`, hot: true, pct: "98%" },
];
