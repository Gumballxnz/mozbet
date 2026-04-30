// Catálogo de jogos MOZBET — URLs do Cloudinary CDN
// Quando as tabelas do Supabase estiverem ativas, este ficheiro será substituído
// por uma chamada fetch ao BD. Por agora, usa os URLs do Cloudinary diretamente.

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
  { id: "aviator", name: "AVIATOR", category: "crash", banner: "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-aviator", hot: true, pct: "97%" },
  { id: "taxi-crash", name: "TAXI CRASH", category: "crash", banner: "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-taxi", hot: true, pct: "96%" },
  { id: "earplane", name: "EARPLANE", category: "crash", banner: "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-earplane", hot: true, pct: "98%" },
  { id: "purple-crash", name: "CRASH", category: "crash", banner: "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-purple-crash", hot: false, pct: "97%" },
  { id: "subway-crash", name: "SUBWAY CRASH", category: "crash", banner: "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/game-crash", hot: false, pct: "95%" },
  { id: "augustus-crash", name: "AUGUSTUS CRASH", category: "crash", banner: "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/game-dragon", hot: false, pct: "96%" },
  { id: "chicken-highway", name: "CHICKEN HIGHWAY", category: "crash", banner: "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/game-keno", hot: false, pct: "94%" },
  
  // Casino & Minigames
  { id: "mines", name: "MINES", category: "casino", banner: "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-mines", hot: true, pct: "98%" },
  { id: "plinko", name: "PLINKO777", category: "casino", banner: "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-plinko", hot: true, pct: "99%" },
  { id: "bottle-mania", name: "BOTTLE MANIA", category: "casino", banner: "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-bottle-mania", hot: false, pct: "99%" },
  { id: "fishinator", name: "FISHINATOR", category: "casino", banner: "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/game-trading", hot: false, pct: "96%" },
  { id: "football-x", name: "FOOTBALL X", category: "casino", banner: "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/game-roulette", hot: false, pct: "95%" },
  { id: "lion-zama", name: "LION ZAMA", category: "casino", banner: "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-lion-zama", hot: true, pct: "99%" },
  
  // Slots
  { id: "mega-fruits", name: "MEGA FRUITS", category: "slots", banner: "https://res.cloudinary.com/dm3glrwax/image/upload/c_limit,f_auto,q_auto,w_800/v1/mozbet/mozbet/banner-mega-fruits", hot: true, pct: "98%" },
];
