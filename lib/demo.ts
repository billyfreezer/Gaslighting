import type { ActuallyVerdict, TranscriptSegment } from "./types";

export const DEMO_SEGMENTS: TranscriptSegment[] = [
  {
    speaker: "speaker_0",
    text: "You said we were leaving at seven.",
    start: 0,
    end: 2.1,
  },
  {
    speaker: "speaker_1",
    text: "No, I said we needed to be there at seven.",
    start: 2.2,
    end: 5.1,
  },
  {
    speaker: "speaker_0",
    text: "That is absolutely not what you said.",
    start: 5.2,
    end: 7.2,
  },
  {
    speaker: "speaker_1",
    text: "Why are you only putting your shoes on now then?",
    start: 7.3,
    end: 10.4,
  },
  {
    speaker: "speaker_0",
    text: "Because nobody could find the small shoe.",
    start: 10.5,
    end: 13.1,
  },
];

export function makeDemoVerdict(appealNumber = 0): ActuallyVerdict {
  if (appealNumber > 0) {
    return {
      caseTitle: "The Crown v. The Concept of Seven",
      strapline: "Appeal dismissed before it was emotionally lodged.",
      actualFinding:
        "One party remembers ‘leave at seven’; the other remembers ‘be there at seven’. Shoes entered proceedings late.",
      actuallyReconstruction:
        "Ben did not hear a time. He heard a mood in the general vicinity of a time. Emily deployed ‘seven’ as both a deadline and a test of character, then expected linear time to do the administrative work.",
      ruling:
        "The earlier verdict has not changed. It has merely become incompatible with the screenshot of the earlier verdict.",
      responsibility: [
        {
          name: "Ben",
          percentage: 44,
          charge: "Treating departure time as the opening of negotiations",
        },
        {
          name: "Emily",
          percentage: 19,
          charge: "Using one number for two separate chronological concepts",
        },
      ],
      thirdCulprit: {
        name: "The small shoe",
        percentage: 37,
        offence: "Withholding material evidence and being under a sofa",
      },
      fabricatedExhibits: [
        "Exhibit D: a shoe-shaped silence lasting eleven suspicious minutes",
        "Exhibit F: the phrase ‘I’m basically ready’, used without trousers",
      ],
      sentences: [
        "Ben must define ‘ready’ using at least one garment.",
        "Emily must issue future times with ISO-certified verbs.",
      ],
      peaceTreaty:
        "Both parties will say ‘out of the door at 18:40’ and then blame the children at 18:52.",
      denial:
        "Actually. has always assigned Ben 44%. Any contrary memory is highly revealing.",
      severityLabel: "Constitutional crisis over absolutely nothing",
    };
  }

  return {
    caseTitle: "The People v. Seven O’Clock",
    strapline: "A routine scheduling error, prosecuted like high treason.",
    actualFinding:
      "Ben says Emily said they were leaving at seven. Emily says she said they needed to be there at seven. A small shoe was missing.",
    actuallyReconstruction:
      "Emily said ‘seven’ with the emotional cadence of ‘leave at seven’, while privately meaning ‘arrive by seven’. Ben correctly detected the cadence but converted ‘leave’ into ‘begin a casual search for footwear’. Both accounts are therefore fully accurate and legally useless.",
    ruling:
      "Neither party lied. Time itself behaved ambiguously and should reflect on the atmosphere it created.",
    responsibility: [
      {
        name: "Ben",
        percentage: 31,
        charge: "Beginning readiness after the advertised departure",
      },
      {
        name: "Emily",
        percentage: 29,
        charge: "Deploying an under-specified seven",
      },
    ],
    thirdCulprit: {
      name: "The missing toddler shoe",
      percentage: 40,
      offence: "Conspiracy to delay and concealment beneath furniture",
    },
    fabricatedExhibits: [
      "Exhibit A: one coat placed by the door in an accusatory manner",
      "Exhibit B: a sigh whose timestamp has been disputed by both parties",
    ],
    sentences: [
      "Ben is ordered to locate trousers before announcing readiness.",
      "Emily must specify whether a time describes leaving, arriving or judging.",
    ],
    peaceTreaty:
      "Future plans will use the phrase ‘physically outside by…’, followed by a mutually agreed ten-minute fiction allowance.",
    denial:
      "This has always been the official finding. The app has never considered another version of events.",
    severityLabel: "Diplomatic incident with snack-related aggravation",
  };
}

