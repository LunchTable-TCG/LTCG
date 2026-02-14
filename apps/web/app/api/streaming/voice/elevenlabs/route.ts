import { resolveStreamingAuth } from "@/lib/streaming/serverAuth";
import { type NextRequest, NextResponse } from "next/server";

interface ElevenLabsVoiceSettings {
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

interface ElevenLabsRequestBody {
  text?: string;
  voiceId?: string;
  modelId?: string;
  outputFormat?: string;
  apiKey?: string;
  returnDataUrl?: boolean;
  voiceSettings?: ElevenLabsVoiceSettings;
}

function clamp01(value: number | undefined): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }
  return Math.max(0, Math.min(1, value));
}

function normalizeVoiceSettings(settings: ElevenLabsVoiceSettings | undefined) {
  const stability = clamp01(settings?.stability);
  const similarityBoost = clamp01(settings?.similarityBoost);
  const style = clamp01(settings?.style);
  const useSpeakerBoost = settings?.useSpeakerBoost;

  const normalized: Record<string, number | boolean> = {};
  if (stability !== undefined) {
    normalized.stability = stability;
  }
  if (similarityBoost !== undefined) {
    normalized.similarity_boost = similarityBoost;
  }
  if (style !== undefined) {
    normalized.style = style;
  }
  if (typeof useSpeakerBoost === "boolean") {
    normalized.use_speaker_boost = useSpeakerBoost;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveStreamingAuth(req);
    if (!auth.userId && !auth.isInternal && !auth.isAgentApiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as ElevenLabsRequestBody;
    const text = body.text?.trim();
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const apiKey = body.apiKey?.trim() || process.env.ELEVENLABS_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "ELEVENLABS_API_KEY is not configured" }, { status: 500 });
    }

    const voiceId =
      body.voiceId?.trim() || process.env.ELEVENLABS_VOICE_ID?.trim() || process.env.ELEVENLABS_DEFAULT_VOICE_ID?.trim() || "EXAVITQu4vr4xnSDxMaL";
    const modelId =
      body.modelId?.trim() || process.env.ELEVENLABS_MODEL_ID?.trim() || process.env.ELEVENLABS_DEFAULT_MODEL_ID?.trim() || "eleven_multilingual_v2";
    const outputFormat = body.outputFormat?.trim() || process.env.ELEVENLABS_OUTPUT_FORMAT?.trim() || "mp3_44100_128";

    const elevenlabsBaseUrl = process.env.ELEVENLABS_API_BASE_URL || "https://api.elevenlabs.io";
    const upstreamResponse = await fetch(
      `${elevenlabsBaseUrl}/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(outputFormat)}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: normalizeVoiceSettings(body.voiceSettings),
        }),
      }
    );

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      return NextResponse.json(
        { error: `ElevenLabs request failed: ${errorText}` },
        { status: upstreamResponse.status }
      );
    }

    const audioBuffer = await upstreamResponse.arrayBuffer();
    const mimeType = "audio/mpeg";

    if (body.returnDataUrl) {
      const base64 = Buffer.from(audioBuffer).toString("base64");
      return NextResponse.json({
        mimeType,
        dataUrl: `data:${mimeType};base64,${base64}`,
      });
    }

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
