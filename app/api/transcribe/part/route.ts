import {
  storeUploadPart,
  uploadErrorResponse,
} from "../../../../lib/transcription-upload.server";

export async function PUT(request: Request) {
  try {
    const sessionId = request.headers.get("x-actually-upload-id") || "";
    const partIndex = Number(request.headers.get("x-actually-part-index"));
    const bytes = await request.arrayBuffer();
    await storeUploadPart(sessionId, partIndex, bytes);
    return Response.json({ received: true }, { status: 201 });
  } catch (error) {
    return uploadErrorResponse(error);
  }
}
