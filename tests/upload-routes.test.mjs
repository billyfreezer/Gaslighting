import assert from "node:assert/strict";
import test from "node:test";

class MemoryBucket {
  constructor() {
    this.data = new Map();
  }

  async put(key, value) {
    let bytes;
    if (typeof value === "string") bytes = new TextEncoder().encode(value);
    else if (value instanceof ArrayBuffer) bytes = new Uint8Array(value);
    else bytes = new Uint8Array(await new Response(value).arrayBuffer());
    this.data.set(key, { bytes, uploaded: new Date() });
  }

  async get(key) {
    const row = this.data.get(key);
    if (!row) return null;
    return {
      key,
      size: row.bytes.byteLength,
      uploaded: row.uploaded,
      arrayBuffer: async () => row.bytes.slice().buffer,
      json: async () => JSON.parse(new TextDecoder().decode(row.bytes)),
    };
  }

  async list({ prefix = "" } = {}) {
    return {
      objects: [...this.data.entries()]
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, row]) => ({
          key,
          size: row.bytes.byteLength,
          uploaded: row.uploaded,
        })),
      truncated: false,
    };
  }

  async delete(keys) {
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      this.data.delete(key);
    }
  }
}

test("reassembles a formerly rejected payload, transcribes it, and deletes temporary bytes", async () => {
  process.env.OPENAI_API_KEY = "test-only";
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("upload-route-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const bucket = new MemoryBucket();
  const runtimeEnv = {
    BUCKET: bucket,
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  };
  const executionContext = {
    waitUntil() {},
    passThroughOnException() {},
  };
  const request = (path, init) =>
    worker.fetch(
      new Request(`http://localhost${path}`, init),
      runtimeEnv,
      executionContext,
    );

  const totalBytes = 2_152_329;
  const partBytes = 768 * 1024;
  const partCount = Math.ceil(totalBytes / partBytes);
  const original = new Uint8Array(totalBytes);
  for (let index = 0; index < original.length; index += 1) {
    original[index] = index % 251;
  }

  const sessionResponse = await request("/api/transcribe/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mimeType: "audio/webm;codecs=opus",
      totalBytes,
      partCount,
    }),
  });
  assert.equal(sessionResponse.status, 200);
  const { sessionId } = await sessionResponse.json();

  for (let index = 0; index < partCount; index += 1) {
    const start = index * partBytes;
    const partResponse = await request("/api/transcribe/part", {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
        "x-actually-upload-id": sessionId,
        "x-actually-part-index": String(index),
      },
      body: original.slice(start, Math.min(totalBytes, start + partBytes)),
    });
    assert.equal(partResponse.status, 201);
  }

  const nativeFetch = globalThis.fetch;
  let upstreamBytes = 0;
  globalThis.fetch = async (input, init) => {
    assert.equal(
      String(input),
      "https://api.openai.com/v1/audio/transcriptions",
    );
    upstreamBytes = init.body.get("file").size;
    return Response.json({
      text: "Seven meant seven.",
      segments: [
        { speaker: "A", text: "Seven meant seven.", start: 0, end: 2 },
      ],
    });
  };

  try {
    const completed = await request("/api/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    assert.equal(completed.status, 200);
    assert.equal(upstreamBytes, totalBytes);
    assert.deepEqual(
      (await completed.json()).segments.map((segment) => segment.speaker),
      ["A"],
    );
    assert.equal(bucket.data.size, 0);
  } finally {
    globalThis.fetch = nativeFetch;
  }
});
