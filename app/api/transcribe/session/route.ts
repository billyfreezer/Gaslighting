import {
  createUploadSession,
  deleteUploadSession,
  uploadErrorResponse,
} from "../../../../lib/transcription-upload.server";
import { UPLOAD_PART_BYTES } from "../../../../lib/upload-protocol";

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      {
        code: "API_NOT_CONFIGURED",
        error: "The court stenographer has not been connected yet.",
      },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as {
      mimeType?: string;
      totalBytes?: number;
      partCount?: number;
    };
    const manifest = await createUploadSession({
      mimeType: String(body.mimeType || "audio/webm"),
      totalBytes: Number(body.totalBytes || 0),
      partCount: Number(body.partCount || 0),
    });
    return Response.json({
      sessionId: manifest.sessionId,
      partBytes: UPLOAD_PART_BYTES,
    });
  } catch (error) {
    return uploadErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { sessionId?: string };
    await deleteUploadSession(String(body.sessionId || ""));
    return Response.json({ deleted: true });
  } catch (error) {
    return uploadErrorResponse(error);
  }
}
