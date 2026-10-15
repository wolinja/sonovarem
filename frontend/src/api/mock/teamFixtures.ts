/**
 * Mock content for the team views (mockups/J6). Placeholders follow the farmer fixtures: no
 * invented Twi, doses or dates (G-DOSE). Turn refs and labels match the mockups.
 */

import type { AdminTurnDetail, RaterItem } from "../contract"
import { mofaMaizeGuide } from "./fixtures"
import { speechClip } from "./scenarios"

const fertiliserCitation = {
  ...mofaMaizeGuide,
  chunk_id: "mofa-maize-2020-fertiliser-03",
  passage: "[Supporting passage from the source, as retrieved]",
}

const fertiliserAnswer =
  "Apply the first fertiliser [WHEN, FROM SOURCE]. The guide says: “[Verbatim dose quote from the source]”. Put it beside the plant, not touching the stem, and cover with soil. Check with an agro-dealer or extension officer before you apply. Follow the label and wear protection."

/** Four answers, repeated to fill a batch of 40 (P1-04 S10: "item 12 of 40"). */
const RATER_TEMPLATES: Omit<RaterItem, "id" | "turn_ref">[] = [
  {
    mode: "twi_voice",
    topic: "fertiliser",
    kind: "dose",
    question_audio_url: speechClip(
      "en",
      "How much fertiliser should I put on my maize after planting?",
    ),
    answer_audio_url: speechClip("en", fertiliserAnswer),
    question_duration_s: 9,
    answer_duration_s: 26,
    transcript: "[Twi transcript of the question]",
    transcript_lang: "tw",
    asr_confidence: 0.82,
    pivot_en: "How much fertiliser should I put on my maize after planting?",
    answer_en: fertiliserAnswer,
    citations: [fertiliserCitation],
  },
  {
    mode: "twi_voice",
    topic: "planting",
    kind: "answer",
    question_audio_url: speechClip("en", "When should I plant my maize?"),
    answer_audio_url: speechClip(
      "en",
      "Plant once the rains are steady, not at the very first rain.",
    ),
    question_duration_s: 6,
    answer_duration_s: 18,
    transcript: "[Twi transcript of the question]",
    transcript_lang: "tw",
    asr_confidence: 0.91,
    pivot_en: "When should I plant my maize this season?",
    answer_en:
      "Plant once the rains are steady, not at the very first rain. Dig a finger deep and plant when the soil is moist at that depth. The guide gives this planting window for your area: [WINDOW FROM SOURCE].",
    citations: [mofaMaizeGuide],
  },
  {
    mode: "english_voice",
    topic: "pests",
    kind: "answer",
    question_audio_url: speechClip(
      "en",
      "Insects are eating my maize leaves. What should I do?",
    ),
    answer_audio_url: speechClip(
      "en",
      "[Key action from the pest section of the guide]",
    ),
    question_duration_s: 7,
    answer_duration_s: 20,
    transcript: "Insects are eating my maize leaves. What should I do?",
    transcript_lang: "en",
    asr_confidence: 0.88,
    pivot_en: "Insects are eating my maize leaves. What should I do?",
    answer_en:
      "[Key action from the pest section of the guide]. [Point 1 from source]. [Point 2 from source].",
    citations: [
      {
        ...mofaMaizeGuide,
        chunk_id: "mofa-maize-2020-pests-02",
        passage: "[Pest passage from source]",
      },
    ],
  },
  {
    mode: "english_text",
    topic: "cassava",
    kind: "idk",
    transcript: "How do I store cassava stem cuttings?",
    transcript_lang: "en",
    pivot_en: "How do I store cassava stem cuttings?",
    answer_en:
      "I don't have reliable information on this. I can help with maize in the Eastern Region. Ask an experienced neighbour, an input seller, or an extension officer if one is near.",
    citations: [],
  },
]

export const RATER_LABEL = "R-07"
export const RATER_BATCH_SIZE = 40
/** The mock batch starts part-way, as in the mockup. */
export const RATER_DONE_AT_START = 11

export function raterItems(): RaterItem[] {
  return Array.from({ length: RATER_BATCH_SIZE }, (_, i) => ({
    ...RATER_TEMPLATES[i % RATER_TEMPLATES.length],
    id: `ri-${String(i + 1).padStart(2, "0")}`,
    turn_ref: `T-${String(380 + i * 3).padStart(4, "0")}`,
  }))
}

const base = {
  citations: [] as AdminTurnDetail["citations"],
  weather: { used: false },
}

export const operatorTurns: AdminTurnDetail[] = [
  {
    ...base,
    id: "t-0412",
    turn_ref: "T-0412",
    topic: "Fertiliser timing",
    mode: "twi_voice",
    source: "field",
    dialect: "Asante Twi",
    rating: 3,
    idk: false,
    asr_confidence: 0.82,
    label: "Dose",
    created_at: "2026-10-13T10:12:00Z",
    transcript: "[Twi transcript of the question]",
    transcript_lang: "tw",
    pivot_en: "How much fertiliser should I put on my maize after planting?",
    answer_en:
      "Apply the first fertiliser [WHEN, FROM SOURCE]. The guide says: “[Verbatim dose quote]”. Check with an agro-dealer or extension officer before you apply.",
    comment: "[Comment transcript, if given]",
    citations: [fertiliserCitation],
    audio: { status: "not_kept" },
    soil: { reading: "Moist", age: "[TIME] ago", simulated: true },
  },
  {
    ...base,
    id: "t-0409",
    turn_ref: "T-0409",
    topic: "Cassava stem cuttings",
    mode: "english_voice",
    source: "live",
    idk: true,
    asr_confidence: 0.9,
    label: "Out of scope",
    created_at: "2026-10-13T09:40:00Z",
    transcript: "How do I store cassava stem cuttings?",
    transcript_lang: "en",
    answer_en:
      "I don't have reliable information on this. I can help with maize in the Eastern Region.",
    audio: { status: "not_kept" },
  },
  {
    ...base,
    id: "t-0401",
    turn_ref: "T-0401",
    topic: "Leaf spots",
    mode: "twi_voice",
    source: "field",
    dialect: "Akuapem Twi",
    rating: 3,
    idk: false,
    asr_confidence: 0.58,
    created_at: "2026-10-12T15:05:00Z",
    transcript: "[Twi transcript of the question]",
    transcript_lang: "tw",
    pivot_en: "My maize leaves have spots. What is it?",
    answer_en: "[Key action from the disease section of the guide].",
    citations: [mofaMaizeGuide],
    audio: {
      status: "kept",
      url: speechClip("en", "My maize leaves have spots. What is it?"),
    },
    soil: { reading: "Dry", age: "[TIME] ago", simulated: true },
    weather: { used: true, summary: "[Forecast summary used in the answer]" },
  },
  {
    ...base,
    id: "t-0388",
    turn_ref: "T-0388",
    topic: "Market prices",
    mode: "english_text",
    source: "live",
    idk: true,
    label: "Out of scope",
    created_at: "2026-10-12T11:20:00Z",
    transcript: "What is the price of maize in Koforidua market?",
    transcript_lang: "en",
    answer_en:
      "I don't have reliable information on this. I can help with maize in the Eastern Region.",
    audio: { status: "typed" },
  },
  {
    ...base,
    id: "t-0377",
    turn_ref: "T-0377",
    topic: "Planting window",
    mode: "twi_voice",
    source: "field",
    dialect: "Asante Twi",
    rating: 2,
    idk: false,
    asr_confidence: 0.86,
    created_at: "2026-10-11T08:45:00Z",
    transcript: "[Twi transcript of the question]",
    transcript_lang: "tw",
    pivot_en: "When should I plant my maize this season?",
    answer_en:
      "Plant once the rains are steady, not at the very first rain. The guide gives this planting window for your area: [WINDOW FROM SOURCE].",
    citations: [mofaMaizeGuide],
    audio: { status: "not_kept" },
    soil: { reading: "Moist", age: "[TIME] ago", simulated: true },
  },
  {
    ...base,
    id: "t-0365",
    turn_ref: "T-0365",
    topic: "Weeding",
    mode: "twi_voice",
    source: "field",
    dialect: "Asante Twi",
    rating: 1,
    idk: false,
    asr_confidence: 0.94,
    created_at: "2026-10-10T14:30:00Z",
    transcript: "[Twi transcript of the question]",
    transcript_lang: "tw",
    pivot_en: "When should I weed my maize?",
    answer_en: "[Key action from the weeding section of the guide].",
    citations: [mofaMaizeGuide],
    audio: { status: "not_kept" },
  },
]

/** Below this, a turn counts as "low ASR confidence" in the operator filters. */
export const LOW_CONFIDENCE = 0.7
