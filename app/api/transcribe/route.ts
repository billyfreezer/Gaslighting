import type { TranscriptSegment } from "../../../lib/types";
import {
  assembleUpload,
  deleteUploadSession,
  UploadProtocolError,
  uploadErrorResponse,
} from "../../../lib/transcription-upload.server";

function fileNameFor(type: string) {
  if (type.includes("mp4")) return "actually-evidence.m4a";
  if (type.includes("ogg")) return "actually-evidence.ogg";
  if (type.includes("wav")) return "actually-evidence.wav";
  return "actually-evidence.webm";
}

export async function POST(request: Request) {
  let sessionId = "";

  try {
    const body = (await request.json()) as { sessionId?: string };
    sessionId = String(body.sessionId || "");
    if (!process.env.OPENAI_API_KEY) {
      throw new UploadProtocolError(
        "The court stenographer has not been connected yet.",
        503,
        "API_NOT_CONFIGURED",
      );
    }

    const { audio, manifest } = await assembleUpload(sessionId);

    const evidence = new FormData();
    evidence.append("file", audio, fileNameFor(manifest.mimeType));
    evidence.append("model", "gpt-4o-transcribe-diarize");
    evidence.append("response_format", "diarized_json");
    evidence.append("chunking_strategy", "auto");

    const upstream = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
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
  } catch (error) {
    if (error instanceof UploadProtocolError) return uploadErrorResponse(error);
    return Response.json(
      {
        error: "Actually. dropped the tape while looking authoritative.",
        code: "TRANSCRIPTION_ERROR",
      },
      { status: 500 },
    );
  } finally {
    if (sessionId) {
      await deleteUploadSession(sessionId).catch(() => undefined);
    }
  }
}
