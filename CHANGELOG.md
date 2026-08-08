# Changelog

## 0.1.1 — 9 August 2026

- Fixed the mobile HTTP 413 failure discovered with an 18-minute,
  2,152,329-byte Pixel 5 recording.
- Added lossless 768 KiB parcel uploads and temporary R2 assembly so the full
  recording reaches diarisation without exceeding the Sites ingress limit.
- Kept the original IndexedDB evidence until transcription succeeds and deleted
  temporary remote parcels after every completed attempt.
- Added visible upload progress and readable handling of non-JSON host errors.
- Added regression coverage for the exact failed payload size, byte-perfect
  reconstruction, mocked transcription and temporary-object deletion.

## 0.1.0 — 8 August 2026

- Created the Actually. product and visual identity.
- Added local 60-minute MediaRecorder capture with five-second IndexedDB chunks.
- Added the Objection → closing arguments → judgement workflow.
- Added speaker-labelled transcription and human name resolution.
- Added structured satirical verdicts, appeals, native sharing and Evidence Locker.
- Added an API-free demonstration case.
- Added PWA manifest, service worker and foreground Wake Lock request.
- Added product, architecture, decisions, roadmap and handover documentation.
- Connected the owner-only deployment to a protected runtime API key.
- Verified real two-speaker diarisation, a schema-valid verdict and a
  contradictory appeal without retranscribing the audio.
- Published the audited prototype source to the intentionally public
  `billyfreezer/Gaslighting` repository with no runtime secret.
