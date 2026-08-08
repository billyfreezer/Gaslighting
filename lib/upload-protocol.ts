export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
export const UPLOAD_PART_BYTES = 768 * 1024;
export const MAX_UPLOAD_PARTS = Math.ceil(
  MAX_AUDIO_BYTES / UPLOAD_PART_BYTES,
);

export function splitAudioBlob(
  audio: Blob,
  partBytes = UPLOAD_PART_BYTES,
): Blob[] {
  if (!Number.isFinite(partBytes) || partBytes <= 0) {
    throw new Error("Upload part size must be positive.");
  }

  const parts: Blob[] = [];
  for (let start = 0; start < audio.size; start += partBytes) {
    parts.push(audio.slice(start, Math.min(audio.size, start + partBytes), audio.type));
  }
  return parts;
}
