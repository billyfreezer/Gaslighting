"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearEvidence,
  evidenceChunkCount,
  readEvidenceChunks,
  saveEvidenceChunk,
} from "../lib/evidence-store";
import { DEMO_SEGMENTS, makeDemoVerdict } from "../lib/demo";
import type {
  ActuallyVerdict,
  AppPhase,
  SpeakerNames,
  TranscriptSegment,
} from "../lib/types";

const MAX_LISTENING_SECONDS = 60 * 60;
const CLOSING_ARGUMENT_SECONDS = 90;

type WakeLockSentinelLike = {
  release: () => Promise<void>;
};

function formatClock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = safe % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function preferredMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function uniqueSpeakers(segments: TranscriptSegment[]) {
  return Array.from(new Set(segments.map((segment) => segment.speaker)));
}

function speakerExcerpt(speaker: string, segments: TranscriptSegment[]) {
  const excerpt = segments.find(
    (segment) => segment.speaker === speaker && segment.text.trim(),
  )?.text;
  return excerpt || "No admissible quotation survived.";
}

function displaySpeaker(speaker: string, names: SpeakerNames) {
  return names[speaker]?.trim() || speaker.replaceAll("_", " ");
}

export default function ActuallyApp() {
  const [phase, setPhase] = useState<AppPhase>("idle");
  const [consent, setConsent] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [closingRemaining, setClosingRemaining] = useState(
    CLOSING_ARGUMENT_SECONDS,
  );
  const [recordedBytes, setRecordedBytes] = useState(0);
  const [topic, setTopic] = useState("");
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [names, setNames] = useState<SpeakerNames>({});
  const [verdict, setVerdict] = useState<ActuallyVerdict | null>(null);
  const [appealNumber, setAppealNumber] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [recoverable, setRecoverable] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const pendingSavesRef = useRef<Promise<void>[]>([]);
  const startedAtRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoJudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const caseDeadlineRef = useRef(0);
  const mimeTypeRef = useRef("audio/webm");
  const audioBlobRef = useRef<Blob | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const finishInProgressRef = useRef(false);

  const speakers = useMemo(() => uniqueSpeakers(segments), [segments]);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    if (closingTimerRef.current) clearInterval(closingTimerRef.current);
    if (autoJudgeTimerRef.current) clearTimeout(autoJudgeTimerRef.current);
    intervalRef.current = null;
    maxTimerRef.current = null;
    closingTimerRef.current = null;
    autoJudgeTimerRef.current = null;
  }, []);

  const releaseHardware = useCallback(async () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (wakeLockRef.current) {
      await wakeLockRef.current.release().catch(() => undefined);
      wakeLockRef.current = null;
    }
  }, []);

  const stopCapture = useCallback(async () => {
    clearTimers();
    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        recorder.addEventListener("stop", () => resolve(), { once: true });
        recorder.stop();
      });
    }

    await Promise.allSettled(pendingSavesRef.current);
    await releaseHardware();
    recorderRef.current = null;

    const blob = new Blob(chunksRef.current, {
      type: mimeTypeRef.current || "audio/webm",
    });
    audioBlobRef.current = blob;
    return blob;
  }, [clearTimers, releaseHardware]);

  const transcribeAudio = useCallback(async (audio: Blob) => {
    if (!audio.size) {
      setErrorMessage("The microphone produced a majestic recording of nothing.");
      setPhase("error");
      return;
    }

    audioBlobRef.current = audio;
    setPhase("transcribing");
    setErrorMessage("");

    try {
      const body = new FormData();
      body.append("audio", audio, "actually-evidence.webm");
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body,
      });
      const result = (await response.json()) as {
        segments?: TranscriptSegment[];
        error?: string;
        code?: string;
      };

      if (!response.ok || !result.segments?.length) {
        throw new Error(
          result.error || "The stenographer returned an impressively blank page.",
        );
      }

      const nextSegments = result.segments;
      const initialNames = Object.fromEntries(
        uniqueSpeakers(nextSegments).map((speaker) => [speaker, ""]),
      );
      setSegments(nextSegments);
      setNames(initialNames);
      audioBlobRef.current = null;
      chunksRef.current = [];
      pendingSavesRef.current = [];
      await clearEvidence();
      setRecoverable(false);
      setPhase("identity");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The evidence has become procedurally inconvenient.",
      );
      setPhase("error");
    }
  }, []);

  const submitCase = useCallback(async () => {
    if (finishInProgressRef.current) return;
    finishInProgressRef.current = true;
    try {
      const audio = await stopCapture();
      await transcribeAudio(audio);
    } finally {
      finishInProgressRef.current = false;
    }
  }, [stopCapture, transcribeAudio]);

  const holdAtLimit = useCallback(async () => {
    if (finishInProgressRef.current) return;
    finishInProgressRef.current = true;
    try {
      await stopCapture();
      setRecoverable(true);
      setPhase("held");
    } finally {
      finishInProgressRef.current = false;
    }
  }, [stopCapture]);

  const startListening = useCallback(async () => {
    if (!consent) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setErrorMessage(
        "This browser cannot run the courtroom microphone. Try the installed app or a current mobile browser.",
      );
      setPhase("error");
      return;
    }

    try {
      await clearEvidence();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const mimeType = preferredMimeType();
      const options: MediaRecorderOptions = { audioBitsPerSecond: 32_000 };
      if (mimeType) options.mimeType = mimeType;

      const recorder = new MediaRecorder(stream, options);
      mimeTypeRef.current = recorder.mimeType || mimeType || "audio/webm";
      localStorage.setItem("actually-recording-mime", mimeTypeRef.current);
      localStorage.setItem("actually-recording-started", String(Date.now()));
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      pendingSavesRef.current = [];
      audioBlobRef.current = null;
      startedAtRef.current = Date.now();
      setElapsed(0);
      setRecordedBytes(0);
      setSegments([]);
      setNames({});
      setVerdict(null);
      setAppealNumber(0);
      setTopic("");
      setIsDemo(false);
      setErrorMessage("");

      recorder.addEventListener("dataavailable", (event) => {
        if (!event.data.size) return;
        chunksRef.current.push(event.data);
        setRecordedBytes((current) => current + event.data.size);
        const save = saveEvidenceChunk(event.data);
        pendingSavesRef.current.push(save);
      });

      recorder.addEventListener("error", () => {
        setErrorMessage("The microphone objected to being cross-examined.");
        setPhase("error");
      });

      recorder.start(5_000);
      setPhase("listening");
      intervalRef.current = setInterval(() => {
        setElapsed((Date.now() - startedAtRef.current) / 1000);
      }, 250);
      maxTimerRef.current = setTimeout(
        () => void holdAtLimit(),
        MAX_LISTENING_SECONDS * 1000,
      );

      const wakeNavigator = navigator as Navigator & {
        wakeLock?: {
          request: (type: "screen") => Promise<WakeLockSentinelLike>;
        };
      };
      if (wakeNavigator.wakeLock) {
        wakeLockRef.current = await wakeNavigator.wakeLock
          .request("screen")
          .catch(() => null);
      }
    } catch {
      await releaseHardware();
      setErrorMessage(
        "Microphone access was not granted. Actually. cannot misremember a conversation it cannot hear.",
      );
      setPhase("error");
    }
  }, [consent, holdAtLimit, releaseHardware]);

  const raiseObjection = useCallback(() => {
    if (phase !== "listening") return;
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.requestData();
    }
    caseDeadlineRef.current = Date.now() + CLOSING_ARGUMENT_SECONDS * 1000;
    setClosingRemaining(CLOSING_ARGUMENT_SECONDS);
    setPhase("objected");
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    maxTimerRef.current = null;
    closingTimerRef.current = setInterval(() => {
      setClosingRemaining(
        Math.max(0, (caseDeadlineRef.current - Date.now()) / 1000),
      );
    }, 200);
    autoJudgeTimerRef.current = setTimeout(
      () => void submitCase(),
      CLOSING_ARGUMENT_SECONDS * 1000,
    );
  }, [phase, submitCase]);

  const extendClosingArguments = useCallback(() => {
    caseDeadlineRef.current += 60_000;
    setClosingRemaining(
      Math.max(0, (caseDeadlineRef.current - Date.now()) / 1000),
    );
    if (autoJudgeTimerRef.current) clearTimeout(autoJudgeTimerRef.current);
    autoJudgeTimerRef.current = setTimeout(
      () => void submitCase(),
      Math.max(0, caseDeadlineRef.current - Date.now()),
    );
  }, [submitCase]);

  const destroyAllEvidence = useCallback(async () => {
    if (recorderRef.current?.state === "recording") {
      await stopCapture().catch(() => undefined);
    } else {
      clearTimers();
      await releaseHardware();
    }
    await clearEvidence().catch(() => undefined);
    chunksRef.current = [];
    pendingSavesRef.current = [];
    audioBlobRef.current = null;
    setRecoverable(false);
    setElapsed(0);
    setRecordedBytes(0);
    setTopic("");
    setSegments([]);
    setNames({});
    setVerdict(null);
    setErrorMessage("");
    setPhase("idle");
  }, [clearTimers, releaseHardware, stopCapture]);

  const recoverLastRecording = useCallback(async () => {
    try {
      const chunks = await readEvidenceChunks();
      if (!chunks.length) throw new Error("No recoverable evidence remains.");
      const type =
        localStorage.getItem("actually-recording-mime") || "audio/webm";
      const audio = new Blob(chunks, { type });
      audioBlobRef.current = audio;
      setRecordedBytes(audio.size);
      await transcribeAudio(audio);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Recovery has been denied.",
      );
      setPhase("error");
    }
  }, [transcribeAudio]);

  const requestVerdict = useCallback(
    async (nextAppeal = 0) => {
      setPhase("judging");
      setErrorMessage("");
      try {
        const response = await fetch("/api/verdict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            segments,
            names: Object.fromEntries(
              Object.entries(names).map(([speaker, name]) => [
                speaker,
                name.trim() || speaker.replaceAll("_", " "),
              ]),
            ),
            topic,
            previousVerdict: nextAppeal > 0 ? verdict : null,
            appealNumber: nextAppeal,
          }),
        });
        const result = (await response.json()) as {
          verdict?: ActuallyVerdict;
          error?: string;
        };

        if (!response.ok || !result.verdict) {
          throw new Error(result.error || "No ruling escaped the chambers.");
        }

        setVerdict(result.verdict);
        setAppealNumber(nextAppeal);
        setPhase("verdict");
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Actually. has temporarily lost confidence, which is unprecedented.",
        );
        setPhase("error");
      }
    },
    [names, segments, topic, verdict],
  );

  const loadDemo = useCallback(() => {
    setIsDemo(true);
    setSegments(DEMO_SEGMENTS);
    setNames({ speaker_0: "Ben", speaker_1: "Emily" });
    setTopic("Were we leaving at seven, or meant to be there at seven?");
    setVerdict(makeDemoVerdict());
    setAppealNumber(0);
    setPhase("verdict");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const appeal = useCallback(() => {
    const nextAppeal = appealNumber + 1;
    if (isDemo) {
      setVerdict(makeDemoVerdict(nextAppeal));
      setAppealNumber(nextAppeal);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    void requestVerdict(nextAppeal);
  }, [appealNumber, isDemo, requestVerdict]);

  const shareVerdict = useCallback(async () => {
    if (!verdict) return;
    const responsibility = [
      ...verdict.responsibility.map(
        (item) => `${item.name}: ${item.percentage}%`,
      ),
      `${verdict.thirdCulprit.name}: ${verdict.thirdCulprit.percentage}%`,
    ].join(" · ");
    const text = `ACTUALLY. — ${verdict.caseTitle}\n\n${verdict.ruling}\n\n${responsibility}\n\n${verdict.denial}`;
    if (navigator.share) {
      await navigator
        .share({ title: verdict.caseTitle, text })
        .catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(text).catch(() => undefined);
    }
  }, [verdict]);

  useEffect(() => {
    evidenceChunkCount()
      .then((count) => setRecoverable(count > 0))
      .catch(() => undefined);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    return () => clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (phase === "listening" || phase === "objected") {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [phase]);

  const retryFromError = () => {
    if (audioBlobRef.current) {
      void transcribeAudio(audioBlobRef.current);
    } else if (segments.length) {
      void requestVerdict(appealNumber);
    } else {
      setPhase("idle");
      setErrorMessage("");
    }
  };

  return (
    <main className={`actually-shell phase-${phase}`}>
      <div className="noise" aria-hidden="true" />
      <header className="topbar">
        <button
          className="wordmark"
          onClick={() => {
            if (phase === "idle") window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          aria-label="Actually home"
        >
          ACTUALLY<span>.</span>
        </button>
        <div className="court-status">
          <span className="status-dot" />
          TROLL SETTING: MAX
        </div>
      </header>

      <section className="stage" aria-live="polite">
        {phase === "idle" && (
          <>
            <div className="hero-copy">
              <p className="eyebrow">THE WORLD’S LEAST RELIABLE WITNESS</p>
              <h1>
                Settle nothing.
                <br />
                <em>Escalate beautifully.</em>
              </h1>
              <p className="hero-lede">
                Actually. listens to the evidence, identifies who said what,
                then reaches the least helpful conclusion with total confidence.
              </p>
            </div>

            <div className="start-card">
              <div className="local-stamp">
                <span>●</span> LOCAL UNTIL YOU OBJECT
              </div>
              <div className="recorder-orbit" aria-hidden="true">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="mic-core">A.</div>
              </div>
              <h2>Open the unofficial record</h2>
              <p>
                Listen for up to 60 minutes. If nothing happens, destroy it.
                No upload. No API call. No cost.
              </p>
              <label className="consent-check">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                <span className="fake-check" aria-hidden="true">✓</span>
                <span>
                  Everyone present knows the red light means recording.
                </span>
              </label>
              <button
                className="primary-button start-button"
                onClick={() => void startListening()}
                disabled={!consent}
              >
                <span className="record-icon" />
                START LISTENING
              </button>
              <button className="text-button" onClick={loadDemo}>
                Try the scandalously trivial demo →
              </button>
            </div>

            {recoverable && (
              <div className="recovery-card">
                <div>
                  <p className="mini-label">UNFINISHED BUSINESS</p>
                  <h3>An abandoned recording was found on this device.</h3>
                </div>
                <div className="recovery-actions">
                  <button onClick={() => void recoverLastRecording()}>
                    Open the case
                  </button>
                  <button
                    className="ghost-danger"
                    onClick={() => void destroyAllEvidence()}
                  >
                    Burn it
                  </button>
                </div>
              </div>
            )}

            <div className="promise-row">
              <span>01 · LISTENS LOCALLY</span>
              <span>02 · OBJECT DRAMATICALLY</span>
              <span>03 · REGRET THE VERDICT</span>
            </div>

            <article className="sample-ruling">
              <div className="sample-docket">
                <span>CASE 00-7PM</span>
                <span>OFFICIAL FINDING</span>
              </div>
              <blockquote>
                “Neither party is lying. Time itself behaved ambiguously.”
              </blockquote>
              <div className="sample-blame">
                <div><b>31%</b><span>THE LATE ONE</span></div>
                <div><b>29%</b><span>THE TIMEKEEPER</span></div>
                <div><b>40%</b><span>ONE SMALL SHOE</span></div>
              </div>
            </article>
          </>
        )}

        {phase === "listening" && (
          <section className="recording-panel">
            <div className="live-ribbon"><span /> RECORDING · LOCAL ONLY</div>
            <p className="eyebrow">MONITORING A PERFECTLY NORMAL CONVERSATION</p>
            <div className="live-visual" aria-hidden="true">
              <i /><i /><i /><i /><i /><i /><i />
            </div>
            <div className="giant-clock">{formatClock(elapsed)}</div>
            <p className="storage-line">
              {formatBytes(recordedBytes)} detained on this device · £0.00 spent
            </p>
            <button className="objection-button" onClick={raiseObjection}>
              <span className="button-kicker">A DISAGREEMENT HAS OCCURRED</span>
              OBJECTION!
              <span className="button-sub">PRESS TO OPEN PROCEEDINGS</span>
            </button>
            <p className="stage-note">
              Actually. is hearing everything and learning absolutely nothing.
            </p>
            <button
              className="destroy-button"
              onClick={() => void destroyAllEvidence()}
            >
              × Destroy the evidence
            </button>
          </section>
        )}

        {phase === "objected" && (
          <section className="closing-panel">
            <div className="objection-seal">OBJECTION RECORDED</div>
            <p className="eyebrow">THE FLOOR IS NOW UNFORTUNATELY YOURS</p>
            <h1>State your case.</h1>
            <p className="closing-copy">
              Both parties may explain, interrupt and introduce the dishwasher
              incident from 2024. Judgement begins automatically.
            </p>
            <div className="closing-clock">
              <span>{formatClock(closingRemaining)}</span>
              <small>UNTIL ACTUALLY. STOPS PRETENDING TO LISTEN</small>
            </div>
            <label className="topic-field">
              <span>What are you allegedly arguing about?</span>
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="e.g. whether ‘seven’ meant leave or arrive"
                maxLength={180}
              />
            </label>
            <button className="primary-button judge-now" onClick={() => void submitCase()}>
              JUDGE US NOW
            </button>
            <button className="text-button pale" onClick={extendClosingArguments}>
              Grant 60 more seconds of inadvisable testimony
            </button>
          </section>
        )}

        {phase === "held" && (
          <section className="held-panel">
            <p className="eyebrow">STATUTORY LISTENING LIMIT REACHED</p>
            <h1>One full hour has been detained.</h1>
            <p>
              It is still only on this device. Opening the case will now upload
              it for transcription; destroying it costs nothing and sends nothing.
            </p>
            <div className="held-actions">
              <button
                className="primary-button"
                onClick={() =>
                  audioBlobRef.current && void transcribeAudio(audioBlobRef.current)
                }
              >
                OPEN THE CASE
              </button>
              <button
                className="destroy-button"
                onClick={() => void destroyAllEvidence()}
              >
                × Destroy the evidence
              </button>
            </div>
          </section>
        )}

        {phase === "transcribing" && (
          <LoadingCourt
            label="ENTERING THE EVIDENCE"
            title="Identifying who said what…"
            notes={[
              "Separating speakers",
              "Locating devastatingly mundane context",
              "Deleting raw audio after transcription",
            ]}
          />
        )}

        {phase === "identity" && (
          <section className="identity-panel">
            <p className="eyebrow">THE IDENTITY PARADE</p>
            <h1>Who said this?</h1>
            <p className="identity-intro">
              The transcript can separate voices, but names require one final
              piece of testimony from someone who was actually there.
            </p>
            <div className="speaker-grid">
              {speakers.map((speaker, index) => (
                <label className="speaker-card" key={speaker}>
                  <span className="speaker-number">VOICE {index + 1}</span>
                  <blockquote>“{speakerExcerpt(speaker, segments)}”</blockquote>
                  <span className="input-label">This was…</span>
                  <input
                    value={names[speaker] || ""}
                    onChange={(event) =>
                      setNames((current) => ({
                        ...current,
                        [speaker]: event.target.value,
                      }))
                    }
                    placeholder={`Person ${index + 1}`}
                    maxLength={40}
                  />
                </label>
              ))}
            </div>
            <label className="topic-field light-field">
              <span>Case description</span>
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="What tiny event caused this constitutional crisis?"
                maxLength={180}
              />
            </label>
            <details className="transcript-preview">
              <summary>Inspect the accurate transcript</summary>
              <Transcript segments={segments} names={names} />
            </details>
            <button
              className="primary-button identity-submit"
              onClick={() => void requestVerdict(0)}
            >
              ISSUE A DANGEROUS RULING
            </button>
          </section>
        )}

        {phase === "judging" && (
          <LoadingCourt
            label={appealNumber ? "RECONSIDERING NOTHING" : "DELIBERATIONS"}
            title={
              appealNumber
                ? "Quietly reversing the verdict…"
                : "Misinterpreting the evidence…"
            }
            notes={[
              "Inflating minor inconsistencies",
              "Locating an innocent third culprit",
              "Preparing a ruling nobody requested",
            ]}
          />
        )}

        {phase === "error" && (
          <section className="error-panel">
            <div className="error-mark">!</div>
            <p className="eyebrow">PROCEDURAL SHAMBLES</p>
            <h1>The court has encountered reality.</h1>
            <p>{errorMessage}</p>
            <div className="error-actions">
              <button className="primary-button" onClick={retryFromError}>
                TRY THAT AGAIN
              </button>
              <button className="text-button" onClick={loadDemo}>
                Inspect the demo verdict instead
              </button>
              <button
                className="destroy-button dark"
                onClick={() => void destroyAllEvidence()}
              >
                Return to safety
              </button>
            </div>
          </section>
        )}

        {phase === "verdict" && verdict && (
          <section className="verdict-page">
            <div className="verdict-masthead">
              <div>
                <p className="eyebrow">OFFICIAL FINDING · FINAL-ISH</p>
                <h1>{verdict.caseTitle}</h1>
                <p>{verdict.strapline}</p>
              </div>
              <div className="case-stamp">
                <span>CASE</span>
                <b>{String(appealNumber + 1).padStart(2, "0")}-A</b>
                <small>ABSURDLY BINDING</small>
              </div>
            </div>

            <div className="severity-banner">
              <span>SEVERITY</span>
              <b>{verdict.severityLabel}</b>
            </div>

            <div className="finding-grid">
              <article className="finding-card factual">
                <div className="card-label"><span>01</span> THE BORING FACTS</div>
                <p>{verdict.actualFinding}</p>
              </article>
              <article className="finding-card reconstruction">
                <div className="card-label"><span>02</span> WHAT ACTUALLY. HEARD</div>
                <p>{verdict.actuallyReconstruction}</p>
              </article>
            </div>

            <article className="ruling-card">
              <span className="ruling-label">THE RULING</span>
              <blockquote>“{verdict.ruling}”</blockquote>
            </article>

            <article className="blame-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">SCIENTIFICALLY INVENTED</p>
                  <h2>Responsibility allocation</h2>
                </div>
                <span className="total-badge">TOTAL: PROBABLY 100%</span>
              </div>
              <div className="blame-list">
                {verdict.responsibility.map((item, index) => (
                  <div className="blame-item" key={`${item.name}-${index}`}>
                    <div className="blame-meta">
                      <span>{item.name}</span><b>{item.percentage}%</b>
                    </div>
                    <div className="blame-track">
                      <span
                        className={`blame-fill fill-${index % 3}`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <small>{item.charge}</small>
                  </div>
                ))}
                <div className="blame-item third-party">
                  <div className="blame-meta">
                    <span>{verdict.thirdCulprit.name}</span>
                    <b>{verdict.thirdCulprit.percentage}%</b>
                  </div>
                  <div className="blame-track">
                    <span
                      className="blame-fill fill-third"
                      style={{ width: `${verdict.thirdCulprit.percentage}%` }}
                    />
                  </div>
                  <small>{verdict.thirdCulprit.offence}</small>
                </div>
              </div>
            </article>

            <div className="exhibits-sentences">
              <article>
                <p className="eyebrow">TOTALLY REAL EXHIBITS</p>
                <h2>Evidence nobody remembers</h2>
                <ol>
                  {verdict.fabricatedExhibits.map((exhibit, index) => (
                    <li key={index}><span>{String.fromCharCode(65 + index)}</span>{exhibit}</li>
                  ))}
                </ol>
              </article>
              <article>
                <p className="eyebrow">SENTENCING</p>
                <h2>Petty corrective measures</h2>
                <ol>
                  {verdict.sentences.map((sentence, index) => (
                    <li key={index}><span>{index + 1}</span>{sentence}</li>
                  ))}
                </ol>
              </article>
            </div>

            <article className="treaty-card">
              <div className="olive-mark">✦</div>
              <div>
                <p className="eyebrow">THE ONE ACTUALLY USEFUL BIT</p>
                <h2>Emergency peace treaty</h2>
                <p>{verdict.peaceTreaty}</p>
              </div>
            </article>

            <p className="denial-line">{verdict.denial}</p>

            <div className="verdict-actions">
              <button className="appeal-button" onClick={appeal}>
                <span>↻</span>
                RECONSIDER THE EVIDENCE
                <small>Receive a different identical ruling</small>
              </button>
              <button className="share-button" onClick={() => void shareVerdict()}>
                SHARE THE DAMAGE ↗
              </button>
            </div>

            <div className="evidence-locker">
              <button onClick={() => setEvidenceOpen((open) => !open)}>
                <span>▣</span>
                EVIDENCE LOCKER
                <small>Accurate transcript · comic inventions excluded</small>
                <b>{evidenceOpen ? "−" : "+"}</b>
              </button>
              {evidenceOpen && <Transcript segments={segments} names={names} />}
            </div>

            <button
              className="burn-case"
              onClick={() => void destroyAllEvidence()}
            >
              Burn this case file and start again
            </button>
          </section>
        )}
      </section>

      <footer className="footer">
        <span>ACTUALLY. IS NOT A THERAPIST, JUDGE OR RELIABLE NARRATOR.</span>
        <span>RAW AUDIO IS DELETED AFTER TRANSCRIPTION.</span>
      </footer>
    </main>
  );
}

function LoadingCourt({
  label,
  title,
  notes,
}: {
  label: string;
  title: string;
  notes: string[];
}) {
  return (
    <section className="loading-court">
      <div className="loading-seal">
        <span>A.</span>
        <i /><i /><i />
      </div>
      <p className="eyebrow">{label}</p>
      <h1>{title}</h1>
      <div className="loading-notes">
        {notes.map((note, index) => (
          <span key={note} style={{ animationDelay: `${index * 0.55}s` }}>
            <i /> {note}
          </span>
        ))}
      </div>
      <p className="loading-warning">DO NOT REFRESH. THE COURT IS VERY SENSITIVE.</p>
    </section>
  );
}

function Transcript({
  segments,
  names,
}: {
  segments: TranscriptSegment[];
  names: SpeakerNames;
}) {
  return (
    <div className="transcript">
      {segments.map((segment, index) => (
        <div className="transcript-line" key={`${segment.start}-${index}`}>
          <span>{formatClock(segment.start)}</span>
          <b>{displaySpeaker(segment.speaker, names)}</b>
          <p>{segment.text}</p>
        </div>
      ))}
    </div>
  );
}

