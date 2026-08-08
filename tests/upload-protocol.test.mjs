import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  splitAudioBlob,
  UPLOAD_PART_BYTES,
} from "../lib/upload-protocol.ts";

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

test("splits and losslessly reconstructs the 2.1 MB failed phone payload", async () => {
  const bytes = new Uint8Array(2_152_329);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = index % 251;
  }
  const audio = new Blob([bytes], { type: "audio/webm;codecs=opus" });

  const parts = splitAudioBlob(audio);

  assert.equal(parts.length, 3);
  assert.ok(parts.every((part) => part.size <= UPLOAD_PART_BYTES));
  assert.ok(parts.every((part) => part.type === audio.type));

  const reconstructed = new Uint8Array(await new Blob(parts).arrayBuffer());
  assert.equal(reconstructed.byteLength, bytes.byteLength);
  assert.equal(digest(reconstructed), digest(bytes));
});
