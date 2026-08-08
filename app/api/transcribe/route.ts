import type { TranscriptSegment } from "../../../lib/types";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

function fileNameFor(type: string) {
  if (type.includes("mp4")) return "actually-evidence.m4a";
  if (type.includes("ogg")) return "actually-evidence.ogg";
  if (type.includes("wav")) return "actually-evidence.wav";
  return "actually-evidence.webm";
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        code: "API_NOT_CONFIGURED",
        error: "The court stenographer has not been connected yet.",
      },
      { status: 503 },
    );
  }

  try {
    const incoming = await request.formData();
    const audio = incoming.get("audio");

    if (!(audio instanceof File) || audio.size === 0) {
      return Response.json(
        { error: "No usable audio evidence was supplied." },
        { status: 400 },
      );
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return Response.json(
        {
          error:
            "This recording is over the 25 MB evidence limit. Shorter proceedings are required.",
        },
        { status: 413 },
      );
    }

    const evidence = new FormData();
    evidence.append("file", audio, fileNameFor(audio.type));
    evidence.append("model", "gpt-4o-transcribe-diarize");
    evidence.append("response_format", "diarized_json");
    evidence.append("chunking_strategy", "auto");

    const upstream = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: evidence,
      },
    );

    if (!upstream.ok) {
      const detail = (await upstream.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      return Response.json(
        {
          error:
            detail?.error?.message ||
            "The stenographer refused to enter the courtroom.",
        },
        { status: upstream.status },
      );
    }

    const result = (await upstream.json()) as {
      text?: string;
      segments?: Array<{
        speaker?: string;
        text?: string;
        start?: number;
        end?: number;
      }>;
    };

    const segments: TranscriptSegment[] = (result.segments || [])
      .filter((segment) => segment.text?.trim())
      .map((segment, index) => ({
        speaker: segment.speaker || `speaker_${index % 2}`,
        text: segment.text?.trim() || "",
        start: Number(segment.start || 0),
        end: Number(segment.end || segment.start || 0),
      }));

    if (segments.length === 0 && result.text?.trim()) {
      segments.push({
        speaker: "speaker_0",
        text: result.text.trim(),
        start: 0,
        end: 0,
      });
    }

    return Response.json({
      text: result.text || segments.map((segment) => segment.text).join(" "),
      segments,
    });
  } catch {
    return Response.json(
      { error: "Actually. dropped the tape while looking authoritative." },
      { status: 500 },
    );
  }
}

