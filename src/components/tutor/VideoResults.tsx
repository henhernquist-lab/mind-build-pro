import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play } from "lucide-react";

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
        const vids = (data?.videos as Video[]) ?? [];
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
        {videos.map((v) => (
          <div key={v.id} className="rounded-lg border border-border overflow-hidden bg-background">
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
            <div className="p-2">
              <div className="text-[11px] font-medium line-clamp-2 leading-snug">{v.title}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{v.channel}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};