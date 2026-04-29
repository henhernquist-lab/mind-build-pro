import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const DEFAULT_MODEL = "eleven_turbo_v2_5";
const MAX_CHARS = 5000;

router.post("/podcast/generate", async (req, res) => {
  const apiKey = process.env["ELEVENLABS_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "ELEVENLABS_API_KEY is not configured" });
    return;
  }

  const body = req.body as {
    text?: unknown;
    title?: unknown;
    voiceId?: unknown;
  };

  const rawText = typeof body.text === "string" ? body.text : "";
  const title = typeof body.title === "string" ? body.title : "Study Podcast";
  const voiceId =
    typeof body.voiceId === "string" && body.voiceId.length > 0
      ? body.voiceId
      : DEFAULT_VOICE_ID;

  const text = rawText.trim().slice(0, MAX_CHARS);
  if (!text) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const intro = `Welcome to your study podcast. Today's topic: ${title}. Let's dive in.\n\n`;
  const outro = `\n\nThat's it for this episode. Keep up the great work, and good luck with your studies.`;
  const script = `${intro}${text}${outro}`;

  try {
    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: script,
          model_id: DEFAULT_MODEL,
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.75,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!elevenRes.ok) {
      const errText = await elevenRes.text();
      logger.error(
        { status: elevenRes.status, errText },
        "ElevenLabs TTS request failed",
      );
      res
        .status(502)
        .json({ error: `ElevenLabs error (${elevenRes.status}): ${errText}` });
      return;
    }

    const arrayBuf = await elevenRes.arrayBuffer();
    const audio = Buffer.from(arrayBuf);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", String(audio.length));
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${title.replace(/[^a-z0-9-_]+/gi, "_")}.mp3"`,
    );
    res.status(200).send(audio);
  } catch (err) {
    logger.error({ err }, "Failed to generate podcast audio");
    res.status(500).json({ error: "Failed to generate podcast audio" });
  }
});

export default router;
