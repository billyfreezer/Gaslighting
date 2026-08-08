# Roadmap

## v0.1 — Working private prototype

- [x] Mobile-first visual experience
- [x] Foreground audio recording for up to 60 minutes
- [x] Five-second IndexedDB chunks and recovery
- [x] Destroy-without-upload boundary
- [x] Objection and timed closing arguments
- [x] Speaker-labelled transcription route
- [x] Speaker identity parade
- [x] Structured maximally comic verdict
- [x] Appeal, share and Evidence Locker
- [x] API-free demo case
- [x] Durable product and architecture documents
- [x] Add private runtime API key
- [x] Smoke-test two-speaker transcription, structured verdict and appeal
- [ ] Test on Ben’s Pixel 5 with two speakers

## v0.1.1 — Mobile upload hotfix

- [x] Reproduce the 18-minute, 2,152,329-byte HTTP 413 failure
- [x] Add lossless 768 KiB parcel uploads beneath the Sites ingress limit
- [x] Reconstruct the complete recording before speaker diarisation
- [x] Delete temporary server-side parcels after success or failure
- [x] Preserve device-local evidence across failed attempts and page reloads
- [x] Replace plain-text/JSON parser failures with a useful message
- [x] Add upload progress and regression tests using the exact failed size
- [ ] Recover and transcribe Ben’s retained 18-minute recording on Pixel 5

## v0.2 — Real-life reliability pass

- [ ] Add IndexedDB unit tests
- [ ] Measure file size after 10, 30 and 60 minutes on Android
- [ ] Test recovery after tab closure, browser backgrounding and incoming call
- [ ] Validate diarisation with overlapping speech and a television in the room
- [ ] Add optional pre-upload audio trimming only if testing proves valuable
- [x] Add a clear upload progress indicator for slower connections
- [ ] Create a shareable rendered verdict image rather than text alone
- [ ] Add a case-specific “relevance window” around the objection in the prompt

## v0.3 — Small private beta

- [ ] Decide authentication and invite model
- [ ] Add usage budgets and rate limits
- [ ] Add privacy notice and retention controls
- [ ] Add opt-in local case history containing verdicts, never raw audio
- [ ] Evaluate native Android wrapper for locked-screen reliability
- [ ] Run comedy-quality evaluation against a curated set of harmless disputes

## Explicitly deferred

- Always-on covert recording
- Automatic name recognition or stored voiceprints
- Claims to detect lies, abuse or relationship health
- Public launch on one person’s unrestricted API key
- Persistent raw conversation archive
