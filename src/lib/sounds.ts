// Tiny synth-based sound effect system (no audio files, no API calls)
// Uses Web Audio API. Persists mute pref in user_preferences.sounds_enabled.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Ctx = AudioContext | null;
let _ctx: Ctx = null;
const getCtx = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (_ctx) return _ctx;
  const C = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!C) return null;
  try { _ctx = new C(); } catch { return null; }
  return _ctx;
};

let MUTED = false;
export const setMuted = (m: boolean) => { MUTED = m; };
export const isMuted = () => MUTED;

const tone = (freq: number, dur: number, type: OscillatorType = "sine", gain = 0.15, delay = 0) => {
  if (MUTED) return;
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
};

const slide = (f1: number, f2: number, dur: number, type: OscillatorType = "sine", gain = 0.15) => {
  if (MUTED) return;
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f1, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
};

const noise = (dur: number, gain = 0.1) => {
  if (MUTED) return;
  const ctx = getCtx();
  if (!ctx) return;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(g).connect(ctx.destination);
  src.start();
};

export const sfx = {
  correct: () => { tone(880, 0.12, "triangle", 0.18); tone(1320, 0.16, "triangle", 0.14, 0.07); },
  wrong:   () => { slide(220, 110, 0.28, "sawtooth", 0.16); },
  rankUp:  () => {
    tone(523, 0.15, "triangle", 0.16);
    tone(659, 0.15, "triangle", 0.16, 0.12);
    tone(784, 0.18, "triangle", 0.18, 0.24);
    tone(1046, 0.4, "triangle", 0.2, 0.4);
  },
  pr:      () => {
    noise(0.25, 0.08);
    tone(660, 0.1, "square", 0.1, 0.05);
    tone(880, 0.18, "square", 0.12, 0.15);
    tone(1320, 0.3, "triangle", 0.15, 0.3);
  },
  click:   () => { tone(1100, 0.04, "square", 0.06); },
  xp:      () => { tone(660, 0.06, "sine", 0.1); tone(990, 0.08, "sine", 0.08, 0.05); },
  combo:   (n: number) => {
    const base = 660 + Math.min(n, 12) * 80;
    tone(base, 0.08, "square", 0.12);
    tone(base * 1.5, 0.1, "triangle", 0.1, 0.04);
  },
  tick:    () => { tone(1500, 0.02, "square", 0.04); },
  gameStart: () => {
    tone(440, 0.08, "triangle", 0.12);
    tone(660, 0.08, "triangle", 0.12, 0.08);
    tone(880, 0.12, "triangle", 0.14, 0.16);
  },
  gameOver: () => {
    slide(880, 220, 0.5, "sawtooth", 0.14);
    tone(196, 0.3, "triangle", 0.12, 0.3);
  },
};

// Hook to load + persist mute pref
export const useSoundPref = (userId?: string) => {
  const [muted, setLocalMuted] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("user_preferences")
        .select("sounds_enabled")
        .eq("user_id", userId)
        .maybeSingle();
      const enabled = (data as any)?.sounds_enabled ?? true;
      const m = !enabled;
      setLocalMuted(m);
      setMuted(m);
    })();
  }, [userId]);

  const toggle = async () => {
    const next = !muted;
    setLocalMuted(next);
    setMuted(next);
    if (userId) {
      await supabase.from("user_preferences").upsert({ user_id: userId, sounds_enabled: !next });
    }
  };

  return { muted, toggle };
};