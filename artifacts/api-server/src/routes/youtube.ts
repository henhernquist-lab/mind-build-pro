import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

type YtSearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      medium?: { url?: string };
      high?: { url?: string };
      default?: { url?: string };
    };
  };
};

router.get("/youtube/search", async (req, res) => {
  const apiKey = process.env["YOUTUBE_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "YOUTUBE_API_KEY is not configured" });
    return;
  }

  const query = typeof req.query["query"] === "string" ? req.query["query"].trim() : "";
  if (!query) {
    res.status(400).json({ error: "query is required" });
    return;
  }

  const requestedMax = Number(req.query["maxResults"] ?? 4);
  const maxResults = Math.min(
    Math.max(Number.isFinite(requestedMax) ? requestedMax : 4, 1),
    10,
  );

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("safeSearch", "strict");
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("key", apiKey);

  try {
    const upstream = await fetch(url.toString());
    if (!upstream.ok) {
      const t = await upstream.text();
      logger.error(
        { status: upstream.status, body: t.slice(0, 500) },
        "YouTube API error",
      );
      res
        .status(upstream.status === 403 ? 502 : upstream.status)
        .json({ error: `YouTube API error (${upstream.status})` });
      return;
    }
    const j = (await upstream.json()) as { items?: YtSearchItem[] };
    const videos = (j.items ?? [])
      .filter((it) => it.id?.videoId)
      .map((it) => ({
        id: it.id!.videoId!,
        title: it.snippet?.title ?? "",
        channel: it.snippet?.channelTitle ?? "",
        thumbnail:
          it.snippet?.thumbnails?.medium?.url ??
          it.snippet?.thumbnails?.high?.url ??
          it.snippet?.thumbnails?.default?.url ??
          "",
        url: `https://www.youtube.com/watch?v=${it.id!.videoId}`,
      }));

    res.set("Cache-Control", "public, max-age=600");
    res.json({ query, videos });
  } catch (err) {
    logger.error({ err }, "Failed to fetch YouTube results");
    res.status(500).json({ error: "Failed to fetch YouTube results" });
  }
});

export default router;
