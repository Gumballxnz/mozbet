import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { playSound } from "@/lib/sounds";

export interface GameRoundState {
  phase: "waiting" | "rising" | "crashed" | "loading";
  multiplier: number;
  countdown: number;
  roundId: string | null;
}

export function useGameEngine(gameId: string) {
  const [gameState, setGameState] = useState<GameRoundState>({
    phase: "loading",
    multiplier: 1.0,
    countdown: 5,
    roundId: null,
  });

  const startedAt = useRef<number>(0);
  const isCrashedRef = useRef<boolean>(false);
  const multiplierRef = useRef<number>(1.0); // For auto-cashout refs

  // Busca inicial do estado
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/game/round?game=${gameId}`);
      const data = await res.json();
      if (!data.round) return;

      const startMs = new Date(data.round.startedAt).getTime();
      const now = Date.now();
      
      startedAt.current = startMs;
      const status = data.round.status;

      setGameState(prev => ({
        ...prev,
        roundId: data.round.id,
        phase: status === "running" ? "rising" : status,
        multiplier: status === "crashed" ? (data.round.crashPoint || 1.0) : 1.0,
        countdown: status === "waiting" ? Math.max(1, Math.ceil((startMs - now) / 1000)) : 0
      }));
      
      isCrashedRef.current = status === "crashed";
      multiplierRef.current = status === "crashed" ? (data.round.crashPoint || 1.0) : 1.0;

    } catch (err) {
      console.error("Erro fetch state", err);
    }
  }, [gameId]);

  useEffect(() => {
    fetchState();

    // Supabase Realtime em vez do problemático Socket.io (Vercel)
    const channel = supabase.channel(`game_${gameId}_channel`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'game_rounds',
        filter: `game_id=eq.${gameId}`
      }, (payload) => {
        const row = payload.new as any;
        const status = row.status;

        if (status === "waiting") {
          playSound('notification');
          startedAt.current = new Date(row.started_at).getTime();
          isCrashedRef.current = false;
          multiplierRef.current = 1.0;
          
          setGameState({
            phase: "waiting",
            multiplier: 1.0,
            roundId: row.id,
            countdown: Math.max(1, Math.ceil((startedAt.current - Date.now()) / 1000))
          });

        } else if (status === "running") {
          isCrashedRef.current = false;
          startedAt.current = new Date(row.started_at).getTime();
          
          setGameState(prev => ({
            ...prev,
            phase: "rising",
            roundId: row.id
          }));

        } else if (status === "crashed") {
          playSound('crash');
          isCrashedRef.current = true;
          multiplierRef.current = Number(row.crash_point);
          
          setGameState(prev => ({
            ...prev,
            phase: "crashed",
            multiplier: Number(row.crash_point),
            roundId: row.id
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, fetchState]);

  // Loop de multiplicador sincronizado
  useEffect(() => {
    if (gameState.phase !== "rising") return;
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt.current;
      const m = Math.exp(0.00006 * elapsed);
      const val = parseFloat(m.toFixed(2));
      
      multiplierRef.current = val;
      setGameState(prev => ({ ...prev, multiplier: val }));
    }, 50);
    
    return () => clearInterval(interval);
  }, [gameState.phase]);

  return { ...gameState, fetchState, startedAt, multiplierRef };
}
