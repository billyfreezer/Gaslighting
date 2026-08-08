import {
  buildVerdictInput,
  VERDICT_SCHEMA,
} from "../../../lib/verdict-prompt";
import type {
  ActuallyVerdict,
  SpeakerNames,
  TranscriptSegment,
} from "../../../lib/types";

const MAX_TRANSCRIPT_CHARACTERS = 180_000;

function extractOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const response = payload as {
    output_text?: string;
    output?: Array<{
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  if (typeof response.output_text === "string") return response.output_text;

  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return null;
}

function looksLikeVerdict(value: unknown): value is ActuallyVerdict {
  if (!value || typeof value !== "object") return false;
  const verdict = value as Partial<ActuallyVerdict>;
  return Boolean(
    verdict.caseTitle &&
      verdict.actualFinding &&
      verdict.actuallyReconstruction &&
      verdict.ruling &&
      Array.isArray(verdict.responsibility) &&
      verdict.thirdCulprit &&
      Array.isArray(verdict.fabricatedExhibits) &&
      verdict.peaceTreaty,
  );
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        code: "API_NOT_CONFIGURED",
        error: "Actually. is dressed for court but has no API key.",
      },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as {
      segments?: TranscriptSegment[];
      names?: SpeakerNames;
      topic?: string;
      previousVerdict?: ActuallyVerdict | null;
      appealNumber?: number;
    };

    const segments = Array.isArray(body.segments) ? body.segments : [];
    const transcriptSize = segments.reduce(
      (total, segment) => total + String(segment.text || "").length,
      0,
    );

    if (segments.length === 0) {
      return Response.json(
        { error: "There is no testimony to wildly reinterpret." },
        { status: 400 },
      );
    }

    if (transcriptSize > MAX_TRANSCRIPT_CHARACTERS) {
      return Response.json(
        { error: "These proceedings exceeded even Actually.’s attention span." },
        { status: 413 },
      );
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VERDICT_MODEL || "gpt-5.6-luna",
        store: false,
        reasoning: { effort: "low" },
        max_output_tokens: 1800,
        input: buildVerdictInput({
          segments,
          names: body.names || {},
          topic: body.topic?.trim() || "",
          previousVerdict: body.previousVerdict,
          appealNumber: Math.max(0, Number(body.appealNumber || 0)),
        }),
        text: {
          format: {
            type: "json_schema",
            name: "actually_relationship_verdict",
            strict: true,
            schema: VERDICT_SCHEMA,
          },
        },
      }),
    });

    if (!response.ok) {
      const detail = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      return Response.json(
        {
          error:
            detail?.error?.message ||
            "The judge has retired to chambers and locked the door.",
        },
        { status: response.status },
      );
    }

    const output = await response.json();
    const text = extractOutputText(output);
    const verdict = text ? (JSON.parse(text) as unknown) : null;

    if (!looksLikeVerdict(verdict)) {
      throw new Error("Invalid verdict shape");
    }

    return Response.json({ verdict });
  } catch {
    return Response.json(
      { error: "The ruling became too legally adventurous to display." },
      { status: 500 },
    );
  }
}

