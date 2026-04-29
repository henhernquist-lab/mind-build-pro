import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, Loader2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  addToWatchLater,
  isInWatchLater,
  removeFromWatchLater,
  subscribeWatchLater,
} from "@/lib/watchLater";
import { useToast } from "@/hooks/use-toast";

type Video = {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  url: string;
};

export const VideoResults = ({
  query,
  cached,
  onCache,
}: {
  query: string;
  cached?: Video[];
  onCache?: (videos: Video[]) => void;
}) => {
  const [videos, setVideos] = useState<Video[] | null>(cached ?? null);
  const [loading, setLoading] = useState(!cached);
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    const refresh = () => {
      const ids = new Set<string>();
      (videos ?? []).forEach((v) => {
        if (isInWatchLater(v.id)) ids.add(v.id);
      });
      setSavedIds(ids);
    };
    refresh();
    return subscribeWatchLater(refresh);
  }, [videos]);

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("youtube-search", {
          body: { query, maxResults: 4 },
        });
        if (cancelled) return;
        if (error) throw error;
        const vids = ((data as any)?.videos as Video[]) ?? [];
        setVideos(vids);
        onCache?.(vids);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Couldn't load videos");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const toggleSave = (v: Video, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInWatchLater(v.id)) {
      removeFromWatchLater(v.id);
      toast({ description: "Removed from Watch Later" });
    } else {
      addToWatchLater({ ...v, query });
      toast({ description: "Saved to Watch Later" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Finding helpful videos…
      </div>
    );
  }
  if (err) {
    return <div className="text-xs text-muted-foreground">No videos available.</div>;
  }
  if (!videos || videos.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
        <Play className="h-3 w-3" /> Videos for "{query}"
      </div>
      <div className="grid grid-cols-2 gap-2">
        {videos.map((v) => {
          const saved = savedIds.has(v.id);
          return (
            <div key={v.id} className="rounded-lg border border-border overflow-hidden bg-background relative">
              {active === v.id ? (
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${v.id}?autoplay=1`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    title={v.title}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setActive(v.id)}
                  className="block w-full text-left group"
                >
                  <div className="aspect-video relative bg-muted">
                    {v.thumbnail && (
                      <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                      <div className="h-9 w-9 rounded-full bg-white/90 flex items-center justify-center">
                        <Play className="h-4 w-4 text-black ml-0.5" fill="currentColor" />
                      </div>
                    </div>
                  </div>
                </button>
              )}
              <button
                type="button"
                onClick={(e) => toggleSave(v, e)}
                onMouseDown={(e) => e.stopPropagation()}
                aria-label={saved ? "Remove from Watch Later" : "Save to Watch Later"}
                title={saved ? "Saved — click to remove" : "Save to Watch Later"}
                className={cn(
                  "absolute top-1.5 right-1.5 z-10 h-8 w-8 rounded-full flex items-center justify-center transition-colors backdrop-blur shadow",
                  saved
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-black/60 text-white hover:bg-black/80",
                )}
              >
                {saved ? (
                  <BookmarkCheck className="h-3.5 w-3.5" fill="currentColor" />
                ) : (
                  <Bookmark className="h-3.5 w-3.5" />
                )}
              </button>
              <div className="p-2">
                <div className="text-[11px] font-medium line-clamp-2 leading-snug">{v.title}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{v.channel}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
