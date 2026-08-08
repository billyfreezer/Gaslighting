# Product and architecture decisions

Material changes require a new numbered decision. Do not silently rewrite an
accepted decision; mark it superseded and link to the replacement.

## D001 — Name the product “Actually.”

**Status:** accepted  
**Reason:** short, relationship-coded and ideal for interface language such as
“Actually. has reconsidered the evidence.”

## D002 — Record locally and transcribe only used cases

**Status:** accepted  
**Decision:** no streaming transcription in the prototype. Starting or
discarding a recording costs nothing and sends nothing remotely.

## D003 — The objection launches a timed closing window

**Status:** accepted  
**Decision:** **OBJECTION!** marks the dispute and starts 90 seconds of further
recording. Judgement begins automatically unless a user submits early or grants
one 60-second extension at a time.

## D004 — Preserve the full recording for v0.1

**Status:** accepted  
**Decision:** upload the complete bounded recording rather than building an
audio trimmer. The transcript can use earlier context, and the expected file
size remains modest. Trimming can be added after real-world testing.

## D005 — Resolve names after diarisation

**Status:** accepted  
**Decision:** do not guess names and do not create biometric voice profiles.
Show one quotation per anonymous voice and ask a human to label it.

## D006 — Keep facts and fabrication visibly separate

**Status:** accepted  
**Decision:** the transcript and factual summary are evidence; the
reconstruction, exhibits, blame and sentences are explicitly comic invention.

## D007 — Troll mundane behaviour, not sensitive vulnerabilities

**Status:** accepted  
**Decision:** maximum comic aggression is directed at timing, phrasing,
household objects, snacks, weather and disproportionate reactions. The verdict
must not invent abuse, infidelity, criminality, diagnoses or other sensitive
allegations.

## D008 — No cloud database in the prototype

**Status:** accepted  
**Decision:** no accounts or remote case history. Raw evidence is device-local;
transcript and verdict live in page memory. This keeps the privacy model and
one-shot prototype small.

## D009 — Build as an installable web app first

**Status:** accepted  
**Decision:** prove the product loop as a PWA. Reconsider a native Android app
only if real testing shows foreground/background recording reliability is a
material blocker.

## D010 — Appeals reuse evidence

**Status:** accepted  
**Decision:** an appeal sends the existing transcript plus previous verdict for
a contradictory reconstruction. It never retranscribes the audio.

