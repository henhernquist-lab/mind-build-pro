// Small helper for calling the game-questions edge function
import { supabase } from "@/integrations/supabase/client";

const URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game-questions`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const callGame = async (payload: any): Promise<any> => {
  const r = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(ANON ? { Authorization: `Bearer ${ANON}` } : {}) },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`game-questions error ${r.status}`);
  return r.json();
};

const BOSS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/boss-personality`;
export const generateBoss = async (subject: string): Promise<{ name: string; personality: string; emoji: string }> => {
  const r = await fetch(BOSS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(ANON ? { Authorization: `Bearer ${ANON}` } : {}) },
    body: JSON.stringify({ subject }),
  });
  if (!r.ok) return { name: "The Challenger", personality: "Mysterious and stoic.", emoji: "👤" };
  return r.json();
};
