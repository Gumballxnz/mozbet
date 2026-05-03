import { NextResponse } from "next/server";

export const revalidate = 60; // Cache por 1 minuto

export async function GET() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  // Seed determinística baseada no tempo global para que todos vejam o mesmo número
  const seed = (now.getDate() * 24 * 60) + (hour * 60) + minute;
  
  let rangeMin = 80;
  let rangeMax = 150;

  if ((hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 23)) {
    rangeMin = 350;
    rangeMax = 580;
  } else if (hour >= 2 && hour <= 6) {
    rangeMin = 40;
    rangeMax = 90;
  } else {
    rangeMin = 150;
    rangeMax = 280;
  }

  const pseudoRandom = Math.abs(Math.sin(seed * 9999));
  const count = Math.floor(rangeMin + pseudoRandom * (rangeMax - rangeMin));

  return NextResponse.json({ count }, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30"
    }
  });
}
