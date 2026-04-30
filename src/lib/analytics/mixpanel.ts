// Lightweight Mixpanel wrapper. No-ops gracefully when VITE_MIXPANEL_TOKEN
// is not set so games don't break in local/preview environments.
import mixpanel from "mixpanel-browser";

const TOKEN = (import.meta.env.VITE_MIXPANEL_TOKEN as string | undefined) ?? "";
let initialized = false;

function ensure(): boolean {
  if (!TOKEN) return false;
  if (!initialized) {
    try {
      mixpanel.init(TOKEN, {
        debug: false,
        track_pageview: false,
        persistence: "localStorage",
      });
      initialized = true;
    } catch {
      return false;
    }
  }
  return true;
}

export const analytics = {
  identify(userId: string) {
    if (!ensure()) return;
    try {
      mixpanel.identify(userId);
    } catch {}
  },
  track(event: string, props?: Record<string, unknown>) {
    if (!ensure()) return;
    try {
      mixpanel.track(event, props);
    } catch {}
  },
  // Convenience for game lifecycle.
  gameStart(p: { game: string; subject?: string }) {
    this.track("game_start", p);
  },
  gameEnd(p: {
    game: string;
    subject?: string;
    score: number;
    accuracy?: number;
    xpEarned: number;
    durationMs?: number;
  }) {
    this.track("game_end", p);
  },
};

export default analytics;