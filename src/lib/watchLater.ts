export type WatchLaterVideo = {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  url: string;
  query?: string;
  savedAt: number;
};

const KEY = "lifestack_watch_later";
const EVENT = "lifestack:watch_later_changed";

const safeRead = (): WatchLaterVideo[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is WatchLaterVideo =>
        v && typeof v.id === "string" && typeof v.title === "string",
    );
  } catch {
    return [];
  }
};

const safeWrite = (list: WatchLaterVideo[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(EVENT));
  } catch {}
};

export const listWatchLater = (): WatchLaterVideo[] =>
  safeRead().sort((a, b) => b.savedAt - a.savedAt);

export const isInWatchLater = (videoId: string): boolean =>
  safeRead().some((v) => v.id === videoId);

export const addToWatchLater = (
  video: Omit<WatchLaterVideo, "savedAt"> & { savedAt?: number },
): WatchLaterVideo[] => {
  const list = safeRead().filter((v) => v.id !== video.id);
  const next: WatchLaterVideo = { ...video, savedAt: video.savedAt ?? Date.now() };
  list.unshift(next);
  safeWrite(list);
  return list;
};

export const removeFromWatchLater = (videoId: string): WatchLaterVideo[] => {
  const list = safeRead().filter((v) => v.id !== videoId);
  safeWrite(list);
  return list;
};

export const clearWatchLater = () => safeWrite([]);

export const subscribeWatchLater = (cb: () => void): (() => void) => {
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
};
