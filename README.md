# Actually.

> Settle nothing. Escalate beautifully.

Actually. is a mobile-first satirical relationship court. It records a live
conversation locally, waits for someone to press **OBJECTION!**, separates the
speakers in the transcript, asks the humans to identify each voice, and issues
an absurdly confident comic ruling.

The current owner-only prototype is deployed at
[actually-app.noble-bee-9658.chatgpt.site](https://actually-app.noble-bee-9658.chatgpt.site).

The prototype’s important promise is literal: ordinary recording does not call
an API. Audio stays on the device until the user deliberately opens a case.
When a case is opened, the complete recording travels in small safe parcels,
is reconstructed before transcription and is removed from temporary server
storage after the attempt.

## Read this before changing the product

The repository is the durable source of truth:

1. [PRODUCT.md](PRODUCT.md) — what the product is and is not
2. [DECISIONS.md](DECISIONS.md) — decisions that must not silently change
3. [ARCHITECTURE.md](ARCHITECTURE.md) — technical design and data boundaries
4. [ROADMAP.md](ROADMAP.md) — staged next work
5. [docs/HANDOVER.md](docs/HANDOVER.md) — current build status and next action

Update these files whenever a material product or technical decision changes.

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `OPENAI_API_KEY` in `.env.local` to exercise real transcription and
verdicts. Without it, the complete visual experience remains available through
the built-in demo case.

Never commit an API key. For a hosted version, set it as a secret runtime
environment variable.

## Validation

```bash
npm run lint
npm test
```

## Current OpenAI calls

- `gpt-4o-transcribe-diarize` through the Transcriptions API for generic
  speaker-labelled segments.
- `gpt-5.6-luna` through the Responses API for a structured comic verdict.
  Override this with `OPENAI_VERDICT_MODEL` if required.

Official references:

- [File transcription and speaker diarisation](https://developers.openai.com/api/docs/guides/speech-to-text)
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Reasoning models](https://developers.openai.com/api/docs/guides/reasoning)
