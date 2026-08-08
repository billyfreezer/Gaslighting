# Actually. handover

Date: **9 August 2026**
Current version: **0.1.1 mobile upload hotfix**

## Current state

The complete one-route prototype has been implemented. It includes real browser
recording, local recoverable chunks, the objection workflow, OpenAI-backed
speaker diarisation and verdict routes, manual voice-to-name mapping, appeals,
sharing, an Evidence Locker and a fully usable demo case.

The first real Pixel 5 attempt recorded for 18 minutes and retained 2,152,329
bytes locally, but the original single multipart request was rejected by Sites
with HTTP 413 before reaching OpenAI. The app then tried to parse the host’s
plain-text rejection as JSON. No transcription charge was incurred and the
recording remained in IndexedDB because the user kept the page/site data open.

Version 0.1.1 fixes that platform boundary. The complete Blob is sent as 768 KiB
transport parcels, held briefly in private R2, reconstructed byte for byte, then
submitted once for speaker diarisation. Temporary remote parcels are deleted
after the attempt; the device copy is deleted only after a successful
transcript. The UI now shows progress and preserves a clear retry path.

The hosted runtime has `OPENAI_API_KEY` configured as a protected secret and is
deployed owner-only at
<https://actually-app.noble-bee-9658.chatgpt.site>. The demo does not require a
key.

The production routes passed a genuine API smoke test on 8 August 2026:

- a synthetic two-voice WAV returned HTTP 200, five diarised segments and the
  anonymous speakers `A` and `B`;
- the verdict route returned HTTP 200, both named participants, a comic third
  culprit and responsibility totalling exactly 100%;
- an appeal returned a materially different ruling while denying any change;
- the appeal reused the transcript and made no second transcription request.

The source repository is intentionally public at
<https://github.com/billyfreezer/Gaslighting>. The API key and hosted runtime
values must never be committed there. The complete audited source has been
published to `main`.

The hosted Site and the public GitHub repository use separate source remotes.
After future checkpoints, mirror the same reviewed source state to GitHub so
the public repository and deployed architecture documents do not drift.

## Next agreed action

1. Deploy v0.1.1 with the new `BUCKET` R2 binding.
2. On Ben’s still-open Pixel 5 page, refresh once after deployment.
3. Use **Open the case** under **Unfinished business** to recover and submit the
   retained 18-minute recording.
4. Confirm the upload reaches 100%, speaker quotations appear and the accurate
   transcript covers the expected conversation.

## First test script

1. Start listening and speak normally for two minutes.
2. Check the timer and stored-size indicator move.
3. Press **OBJECTION!**.
4. Both people make a short case for 20–30 seconds.
5. Enter the alleged subject and press **Judge us now**.
6. Verify each voice quotation is attributed correctly before entering names.
7. Generate the verdict and open the Evidence Locker.
8. Appeal once and confirm it does not retranscribe.
9. Start a second recording, destroy it and confirm no API request is made.

## Known limitations

- A PWA cannot promise continuous recording after screen lock or OS termination.
- The prototype submits the complete recording through temporary parcels; an
  hour-long test is still needed to validate end-to-end duration and diarised
  transcript completeness.
- Interrupted temporary uploads are deleted best-effort by the browser and
  stale objects are purged when the next session starts; the prototype has no
  scheduled cleanup worker.
- The public launch controls in `ARCHITECTURE.md` are not yet implemented.
- There is no automated route test suite yet.
- Automated visual preview was unavailable in the cloud-browser environment for
  this checkpoint; the production build, rendered-HTML test and live API routes
  all passed.

## Do not change without a decision record

- Local-until-case privacy boundary
- 90-second post-objection closing window
- Manual mapping of voice labels to names
- Visual separation of evidence and satire
- No sensitive fabricated allegations
- No cloud case history in v0.1
