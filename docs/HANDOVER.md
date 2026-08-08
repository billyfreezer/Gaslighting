# Actually. handover

Date: **8 August 2026**  
Current version: **0.1.0 prototype**

## Current state

The complete one-route prototype has been implemented. It includes real browser
recording, local recoverable chunks, the objection workflow, OpenAI-backed
speaker diarisation and verdict routes, manual voice-to-name mapping, appeals,
sharing, an Evidence Locker and a fully usable demo case.

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
values must never be committed there.

## Next agreed action

1. Publish this existing codebase to the user-owned GitHub repository; do not
   regenerate the app from a prompt.
2. Test on Ben’s Pixel 5 with Ben and Emily speaking.
3. Record the results against the manual acceptance steps below.

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
- The prototype submits the complete recording; an hour-long real test is still
  needed to validate request duration and diarised transcript completeness.
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
