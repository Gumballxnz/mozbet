import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addMissingGames() {
  const newGames = [
    {
      id: "footballx",
      name: "Football X",
      category: "Crash",
      banner_url: "/api/img/footballx.jpg",
      is_active: true,
      sort_order: 8
    },
    {
      id: "fishinator",
      name: "Fishinator",
      category: "Slots",
      banner_url: "/api/img/fishinator.jpg",
      is_active: true,
      sort_order: 9
    },
    {
      id: "chicken-highway",
      name: "Chicken Highway",
      category: "Arcade",
      banner_url: "/api/img/chicken-highway.jpg",
      is_active: true,
      sort_order: 10
    },
    {
      id: "augustus-crash",
      name: "Augustus Crash",
      category: "Crash",
      banner_url: "/api/img/augustus.png",
      is_active: true,
      sort_order: 11
    },
    {
      id: "subway-crash",
      name: "Subway Crash",
      category: "Crash",
      banner_url: "/api/img/subway.png",
      is_active: true,
      sort_order: 12
    }
  ];

  for (const game of newGames) {
    const { data, error } = await supabase.from('games').upsert(game, { onConflict: 'id' });
    if (error) {
      console.error(`Error inserting ${game.id}:`, error.message);
    } else {
      console.log(`Inserted ${game.id} successfully.`);
    }
  }
}

addMissingGames().then(() => console.log('Done'));
