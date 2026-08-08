import {
  MAX_AUDIO_BYTES,
  MAX_UPLOAD_PARTS,
  UPLOAD_PART_BYTES,
} from "./upload-protocol";
import { runtimeBindings } from "./runtime-bindings";

const TEMP_PREFIX = "actually-temporary-evidence/";
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

export type UploadManifest = {
  version: 1;
  sessionId: string;
  mimeType: string;
  totalBytes: number;
  partCount: number;
  createdAt: number;
};

export class UploadProtocolError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "UPLOAD_ERROR",
  ) {
    super(message);
  }
}

function evidenceBucket(): R2Bucket {
  const bucket = runtimeBindings().BUCKET;
  if (!bucket) {
    throw new UploadProtocolError(
      "The temporary evidence locker is unavailable.",
      503,
      "STORAGE_NOT_CONFIGURED",
    );
  }
  return bucket;
}

function validSessionId(sessionId: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    sessionId,
  );
}

function assertSessionId(sessionId: string) {
  if (!validSessionId(sessionId)) {
    throw new UploadProtocolError(
      "The evidence ticket is invalid.",
      400,
      "INVALID_SESSION",
    );
  }
}

function sessionPrefix(sessionId: string) {
  assertSessionId(sessionId);
  return `${TEMP_PREFIX}${sessionId}/`;
}

function manifestKey(sessionId: string) {
  return `${sessionPrefix(sessionId)}manifest.json`;
}

function partKey(sessionId: string, partIndex: number) {
  return `${sessionPrefix(sessionId)}part-${String(partIndex).padStart(3, "0")}`;
}

function normaliseMimeType(value: string) {
  const mimeType = value.trim().slice(0, 100);
  return mimeType.startsWith("audio/") ? mimeType : "audio/webm";
}

export async function cleanupStaleUploads() {
  const bucket = evidenceBucket();
  const cutoff = Date.now() - STALE_AFTER_MS;
  let cursor: string | undefined;

  do {
    const listed = await bucket.list({
      prefix: TEMP_PREFIX,
      cursor,
      limit: 1000,
    });
    const staleKeys = listed.objects
      .filter((object) => object.uploaded.getTime() < cutoff)
      .map((object) => object.key);
    if (staleKeys.length) await bucket.delete(staleKeys);
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
}

export async function createUploadSession(input: {
  mimeType: string;
  totalBytes: number;
  partCount: number;
}) {
  const totalBytes = Math.floor(Number(input.totalBytes));
  const partCount = Math.floor(Number(input.partCount));

  if (totalBytes <= 0 || totalBytes > MAX_AUDIO_BYTES) {
    throw new UploadProtocolError(
      "This recording is outside the 25 MB evidence limit.",
      413,
      "AUDIO_TOO_LARGE",
    );
  }
  if (partCount <= 0 || partCount > MAX_UPLOAD_PARTS) {
    throw new UploadProtocolError(
      "The evidence was divided into an implausible number of parcels.",
      400,
      "INVALID_PART_COUNT",
    );
  }

  await cleanupStaleUploads().catch(() => undefined);

  const sessionId = crypto.randomUUID();
  const manifest: UploadManifest = {
    version: 1,
    sessionId,
    mimeType: normaliseMimeType(input.mimeType),
    totalBytes,
    partCount,
    createdAt: Date.now(),
  };
  await evidenceBucket().put(manifestKey(sessionId), JSON.stringify(manifest), {
    httpMetadata: { contentType: "application/json" },
  });
  return manifest;
}

export async function readUploadManifest(sessionId: string) {
  const object = await evidenceBucket().get(manifestKey(sessionId));
  if (!object) {
    throw new UploadProtocolError(
      "That temporary evidence ticket has expired. Please try the upload again.",
      404,
      "SESSION_NOT_FOUND",
    );
  }
  const manifest = (await object.json()) as UploadManifest;
  if (
    manifest.version !== 1 ||
    manifest.sessionId !== sessionId ||
    manifest.totalBytes <= 0 ||
    manifest.partCount <= 0
  ) {
    throw new UploadProtocolError(
      "The temporary evidence manifest is invalid.",
      409,
      "INVALID_MANIFEST",
    );
  }
  return manifest;
}

export async function storeUploadPart(
  sessionId: string,
  partIndex: number,
  bytes: ArrayBuffer,
) {
  const manifest = await readUploadManifest(sessionId);
  if (!Number.isInteger(partIndex) || partIndex < 0 || partIndex >= manifest.partCount) {
    throw new UploadProtocolError(
      "The evidence parcel number is invalid.",
      400,
      "INVALID_PART_INDEX",
    );
  }
  if (bytes.byteLength <= 0 || bytes.byteLength > UPLOAD_PART_BYTES) {
    throw new UploadProtocolError(
      "One evidence parcel exceeded the safe upload size.",
      413,
      "PART_TOO_LARGE",
    );
  }

  await evidenceBucket().put(partKey(sessionId, partIndex), bytes, {
    httpMetadata: { contentType: "application/octet-stream" },
  });
}

export async function assembleUpload(sessionId: string) {
  const manifest = await readUploadManifest(sessionId);
  const parts: ArrayBuffer[] = [];
  let receivedBytes = 0;

  for (let index = 0; index < manifest.partCount; index += 1) {
    const object = await evidenceBucket().get(partKey(sessionId, index));
    if (!object) {
      throw new UploadProtocolError(
        `Evidence parcel ${index + 1} of ${manifest.partCount} is missing.`,
        409,
        "PART_MISSING",
      );
    }
    const bytes = await object.arrayBuffer();
    receivedBytes += bytes.byteLength;
    parts.push(bytes);
  }

  if (receivedBytes !== manifest.totalBytes) {
    throw new UploadProtocolError(
      "The reconstructed recording did not match the original evidence.",
      409,
      "SIZE_MISMATCH",
    );
  }

  return {
    manifest,
    audio: new Blob(parts, { type: manifest.mimeType }),
  };
}

export async function deleteUploadSession(sessionId: string) {
  const prefix = sessionPrefix(sessionId);
  let cursor: string | undefined;

  do {
    const listed = await evidenceBucket().list({ prefix, cursor, limit: 1000 });
    const keys = listed.objects.map((object) => object.key);
    if (keys.length) await evidenceBucket().delete(keys);
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
}

export function uploadErrorResponse(error: unknown) {
  if (error instanceof UploadProtocolError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  return Response.json(
    {
      error: "The temporary evidence locker malfunctioned theatrically.",
      code: "UPLOAD_ERROR",
    },
    { status: 500 },
  );
}
