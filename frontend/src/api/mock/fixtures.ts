/**
 * Mock content. Twi wording is left to M1's glossary (P0-03 J1), so Twi text is a bracketed
 * placeholder, as in the mockups. Doses and planting windows are placeholders too: G-DOSE forbids
 * any dose that is not verbatim from a cited source, so the mock never invents one.
 */

import { consentSlots, cropScope } from "@/config/content"
import type { ConsentText, MemoryItem } from "../contract"
import type { Citation, FallbackItem, SentenceKind } from "../events"

export function consentText(version: string): ConsentText {
  return {
    version,
    layers: ["service"],
    summary: [
      "We record your question so we can answer it.",
      `It is sent to ${consentSlots.providers} in ${consentSlots.countries} to turn speech into text and back.`,
      "Your recording is not kept unless you say yes later.",
      "You can delete everything from Settings at any time.",
    ],
    controller: consentSlots.controller,
    full_text_url: "#consent-full-text",
    audio_urls: {},
  }
}

export const mofaMaizeGuide: Citation = {
  chunk_id: "mofa-maize-2020-planting-01",
  label_spoken: "Ministry of Food and Agriculture maize guide",
  publisher: "Ministry of Food and Agriculture (MoFA)",
  title: "Maize production guide",
  date: "[YEAR]",
  page: "[PAGE]",
  passage: "[SHORT SUPPORTING PASSAGE FROM THE GUIDE]",
}

export interface FixtureSentence {
  kind: SentenceKind
  en: string
  /** Twi rendering; placeholder until the glossary and MT exist. */
  tw: string
}

export interface FixtureAnswer {
  id: string
  /** Matches typed questions and menu choices to this answer. */
  keywords: string[]
  question: { en: string; tw: string }
  sentences: FixtureSentence[]
  citations: Citation[]
  dose?: boolean
}

export const answers: FixtureAnswer[] = [
  {
    id: "planting",
    keywords: ["plant", "planting", "sow"],
    question: {
      en: "When should I plant my maize this season?",
      tw: "[Twi transcript of the question, as heard]",
    },
    sentences: [
      {
        kind: "advice",
        en: "Plant once the rains are steady, not at the very first rain.",
        tw: "[Key action, in Twi]",
      },
      {
        kind: "advice",
        en: "Dig a finger deep. Plant when the soil is moist at that depth.",
        tw: "[Point 1, in Twi]",
      },
      {
        kind: "advice",
        en: "Plant early in the steady rains so the maize has water when it flowers.",
        tw: "[Point 2, in Twi]",
      },
      {
        kind: "advice",
        en: "The guide gives this planting window for your area: [WINDOW FROM SOURCE].",
        tw: "[Point 3, in Twi]",
      },
    ],
    citations: [mofaMaizeGuide],
  },
  {
    id: "fertiliser",
    keywords: ["fertiliser", "fertilizer", "npk", "urea", "top-dress", "dose"],
    question: {
      en: "How much fertiliser do I put on my maize after planting?",
      tw: "[Twi transcript of the question, as heard]",
    },
    sentences: [
      {
        kind: "advice",
        en: "Apply the first fertiliser [WHEN, FROM SOURCE], using exactly the amount the guide gives below.",
        tw: "[Key action, in Twi]",
      },
      {
        kind: "dose",
        en: "[Verbatim dose quote from the source, with its own unit]",
        tw: "[Dose sentence in Twi, numbers and units unchanged]",
      },
      {
        kind: "safety",
        en: "Check with an agro-dealer or extension officer before you apply. Follow the label on the bag and wear protection.",
        tw: "[PR-ANS-03, in Twi]",
      },
      {
        kind: "advice",
        en: "Young maize needs food for its leaves before it grows tall.",
        tw: "[Point 1, in Twi]",
      },
      {
        kind: "advice",
        en: "Put it beside the plant, not touching the stem, then cover with soil.",
        tw: "[Point 2, in Twi]",
      },
      {
        kind: "advice",
        en: "Apply when the soil is moist, so it does not wash away or burn the roots.",
        tw: "[Point 3, in Twi]",
      },
    ],
    citations: [
      {
        ...mofaMaizeGuide,
        chunk_id: "mofa-maize-2020-fertiliser-03",
        passage: "[FERTILISER PASSAGE, VERBATIM]",
      },
    ],
    dose: true,
  },
  {
    id: "pests",
    keywords: [
      "worm",
      "insect",
      "eating",
      "pest",
      "holes",
      "maggot",
      "leaves",
      "spots",
    ],
    question: {
      en: "Worms are eating my maize leaves. What should I do?",
      tw: "[Twi transcript of the question, as heard]",
    },
    sentences: [
      {
        kind: "advice",
        en: "[KEY ACTION FROM THE PEST SECTION OF THE GUIDE]",
        tw: "[Key action, in Twi]",
      },
      {
        kind: "advice",
        en: "[POINT 1 FROM SOURCE]",
        tw: "[Point 1, in Twi]",
      },
      {
        kind: "advice",
        en: "[POINT 2 FROM SOURCE]",
        tw: "[Point 2, in Twi]",
      },
    ],
    citations: [
      {
        ...mofaMaizeGuide,
        chunk_id: "mofa-maize-2020-pests-02",
        passage: "[PEST PASSAGE FROM SOURCE]",
      },
    ],
  },
]

export const defaultAnswer = answers[0]

export function findAnswer(text: string | undefined): FixtureAnswer {
  if (!text) return defaultAnswer
  const lower = text.toLowerCase()
  let best = defaultAnswer
  let bestScore = 0
  for (const answer of answers) {
    const score = answer.keywords.filter((k) => lower.includes(k)).length
    if (score > bestScore) {
      best = answer
      bestScore = score
    }
  }
  return best
}

/** S05c menu (mockups/J4). `icon` is a Material Symbols name; labels are spoken from audio_key. */
export const fallbackItems: FallbackItem[] = [
  {
    id: "fbm-plant",
    audio_key: "PR-FBM-01",
    label_en: "When should I plant maize?",
    icon: "calendar_month",
  },
  {
    id: "fbm-fert",
    audio_key: "PR-FBM-02",
    label_en: "Which fertiliser, and when?",
    icon: "compost",
  },
  {
    id: "fbm-pests",
    audio_key: "PR-FBM-03",
    label_en: "Insects are eating my leaves",
    icon: "pest_control",
  },
  {
    id: "fbm-disease",
    audio_key: "PR-FBM-04",
    label_en: "My leaves have spots or stripes",
    icon: "coronavirus",
  },
]

/** S05b (mockups/J4): one slot, a reason, and quick replies. */
export const clarifyFixture = {
  slot: "growth_stage",
  text: "[Clarifying question, in Twi]",
  text_en: "How big is your maize now?",
  reason_en: "The right time depends on how far the maize has grown.",
  quick_replies: ["Just planted", "Knee high", "Flowering", "I am not sure"],
}

export const idkFixture = {
  can_help_with: [cropScope.label],
  next_steps: [
    "Ask an experienced neighbour",
    "Ask an input seller",
    "Ask an extension officer if one is near",
  ],
}

/** Seeded "returning user" for the S05e recap (mockups/J4): any phone number ending in 0000. */
export const returningUserMemory: MemoryItem[] = [
  {
    id: "mem-farm",
    summary_en: "Your maize farm near [TOWN]",
    kind: "farm",
    created_at: "2026-10-12T08:00:00Z",
  },
  {
    id: "mem-insects",
    summary_en: "Insects on your maize leaves",
    kind: "problem",
    created_at: "2026-10-13T09:30:00Z",
  },
]

export const MOCK_OTP_CODE = "123456"
