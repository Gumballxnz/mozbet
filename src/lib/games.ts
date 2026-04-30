// Catálogo de jogos MOZBET — URLs via proxy interno (esconde Cloudinary)
// Quando as tabelas do Supabase estiverem com fetch server-side,
// este ficheiro será substituído por dados vindos do BD

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
  { id: "aviator", name: "AVIATOR", category: "crash", banner: "/api/img/banner-aviator", hot: true, pct: "97%" },
  { id: "taxi-crash", name: "TAXI CRASH", category: "crash", banner: "/api/img/banner-taxi", hot: true, pct: "96%" },
  { id: "earplane", name: "EARPLANE", category: "crash", banner: "/api/img/banner-earplane", hot: true, pct: "98%" },
  { id: "purple-crash", name: "CRASH", category: "crash", banner: "/api/img/banner-purple-crash", hot: false, pct: "97%" },
  { id: "subway-crash", name: "SUBWAY CRASH", category: "crash", banner: "/api/img/game-crash", hot: false, pct: "95%" },
  { id: "augustus-crash", name: "AUGUSTUS CRASH", category: "crash", banner: "/api/img/game-dragon", hot: false, pct: "96%" },
  { id: "chicken-highway", name: "CHICKEN HIGHWAY", category: "crash", banner: "/api/img/game-keno", hot: false, pct: "94%" },
  
  // Casino & Minigames
  { id: "mines", name: "MINES", category: "casino", banner: "/api/img/banner-mines", hot: true, pct: "98%" },
  { id: "plinko", name: "PLINKO777", category: "casino", banner: "/api/img/banner-plinko", hot: true, pct: "99%" },
  { id: "bottle-mania", name: "BOTTLE MANIA", category: "casino", banner: "/api/img/banner-bottle-mania", hot: false, pct: "99%" },
  { id: "fishinator", name: "FISHINATOR", category: "casino", banner: "/api/img/game-trading", hot: false, pct: "96%" },
  { id: "football-x", name: "FOOTBALL X", category: "casino", banner: "/api/img/game-roulette", hot: false, pct: "95%" },
  { id: "lion-zama", name: "LION ZAMA", category: "casino", banner: "/api/img/banner-lion-zama", hot: true, pct: "99%" },
  
  // Slots
  { id: "mega-fruits", name: "MEGA FRUITS", category: "slots", banner: "/api/img/banner-mega-fruits", hot: true, pct: "98%" },
];
