export type AppPhase =
  | "idle"
  | "listening"
  | "objected"
  | "held"
  | "transcribing"
  | "identity"
  | "judging"
  | "verdict"
  | "error";

export type TranscriptSegment = {
  speaker: string;
  text: string;
  start: number;
  end: number;
};

export type Responsibility = {
  name: string;
  percentage: number;
  charge: string;
};

export type ThirdCulprit = {
  name: string;
  percentage: number;
  offence: string;
};

export type ActuallyVerdict = {
  caseTitle: string;
  strapline: string;
  actualFinding: string;
  actuallyReconstruction: string;
  ruling: string;
  responsibility: Responsibility[];
  thirdCulprit: ThirdCulprit;
  fabricatedExhibits: string[];
  sentences: string[];
  peaceTreaty: string;
  denial: string;
  severityLabel: string;
};

export type SpeakerNames = Record<string, string>;
