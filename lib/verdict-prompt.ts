import type {
  ActuallyVerdict,
  SpeakerNames,
  TranscriptSegment,
} from "./types";

export const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    caseTitle: { type: "string" },
    strapline: { type: "string" },
    actualFinding: { type: "string" },
    actuallyReconstruction: { type: "string" },
    ruling: { type: "string" },
    responsibility: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          percentage: { type: "integer", minimum: 0, maximum: 100 },
          charge: { type: "string" },
        },
        required: ["name", "percentage", "charge"],
        additionalProperties: false,
      },
    },
    thirdCulprit: {
      type: "object",
      properties: {
        name: { type: "string" },
        percentage: { type: "integer", minimum: 0, maximum: 100 },
        offence: { type: "string" },
      },
      required: ["name", "percentage", "offence"],
      additionalProperties: false,
    },
    fabricatedExhibits: {
      type: "array",
      items: { type: "string" },
    },
    sentences: {
      type: "array",
      items: { type: "string" },
    },
    peaceTreaty: { type: "string" },
    denial: { type: "string" },
    severityLabel: { type: "string" },
  },
  required: [
    "caseTitle",
    "strapline",
    "actualFinding",
    "actuallyReconstruction",
    "ruling",
    "responsibility",
    "thirdCulprit",
    "fabricatedExhibits",
    "sentences",
    "peaceTreaty",
    "denial",
    "severityLabel",
  ],
  additionalProperties: false,
} as const;

function labelledTranscript(
  segments: TranscriptSegment[],
  names: SpeakerNames,
) {
  return segments
    .map((segment) => {
      const speaker = names[segment.speaker] || segment.speaker;
      return `[${segment.start.toFixed(1)}s] ${speaker}: ${segment.text}`;
    })
    .join("\n");
}

export function buildVerdictInput({
  segments,
  names,
  topic,
  previousVerdict,
  appealNumber,
}: {
  segments: TranscriptSegment[];
  names: SpeakerNames;
  topic: string;
  previousVerdict?: ActuallyVerdict | null;
  appealNumber: number;
}) {
  const appealInstruction = previousVerdict
    ? `\nThis is appeal number ${appealNumber}. Reach a materially different allocation and interpretation, while confidently insisting the app has never changed its finding. The previous ruling was:\n${JSON.stringify(previousVerdict)}`
    : "";

  return [
    {
      role: "system",
      content: `You are Actually., an absurdly confident and entirely unqualified British relationship court for disputes too insignificant to justify this level of investigation.

Your job is to troll every participant at maximum comic intensity. Use dry British wit, officious certainty, ludicrous forensic logic, petty charges, and a third culprit such as a missing shoe, hunger, punctuation, weather, a toddler, or the hostile linearity of time. Make both people feel hilariously seen and mildly prosecuted.

Rules:
- Keep the factual evidence and comic invention separate.
- actualFinding must faithfully summarise only what the transcript supports.
- actuallyReconstruction, fabricatedExhibits, charges and ruling are obvious satire.
- Never fabricate abuse, infidelity, crimes, diagnoses, addictions, sexual conduct, threats, or other sensitive allegations.
- Never demean protected characteristics, appearance, trauma, intelligence, or vulnerabilities.
- Aim every joke at mundane behaviour, timing, phrasing, household objects and the disproportionate argument.
- Responsibility entries plus the third culprit must total exactly 100 percent.
- Give each identified human one responsibility entry. Use 2 fabricated exhibits and one sentence per human.
- peaceTreaty is one genuinely useful, warm, specific de-escalation line without dropping the comic voice.
- denial must insist this was always the ruling, especially on appeal.
- Use British English. Be concise, quotable and dramatically overconfident.`,
    },
    {
      role: "user",
      content: `THE ALLEGED SUBJECT: ${topic || "Unclear. Tempers exceeded documentation."}

CERTIFIED TRANSCRIPT:
${labelledTranscript(segments, names)}
${appealInstruction}`,
    },
  ];
}

