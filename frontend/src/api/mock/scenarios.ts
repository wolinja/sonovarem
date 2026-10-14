/**
 * Mock turn scenarios, as data. A scenario turns one submitted turn into a script of SSE events
 * (P1-05 §4.3) with delays. `{ gate: "confirm" }` pauses the script until the client confirms the
 * echo-back. Add a scenario by adding an entry to `scenarios`; nothing else changes.
 */

import type { Lang, Mode, TurnKind } from "../contract"
import type { TurnEventData, TurnEventName } from "../events"
import {
  clarifyFixture,
  type FixtureAnswer,
  fallbackItems,
  findAnswer,
  idkFixture,
} from "./fixtures"

export type EventStep = {
  [K in TurnEventName]: { after: number; event: K; data: TurnEventData[K] }
}[TurnEventName]

export type ScriptStep = EventStep | { gate: "confirm" }

export interface ScenarioInput {
  mode: Mode
  kind: TurnKind
  text?: string
  menuItemId?: string
}

export interface Scenario {
  id: string
  label: string
  description: string
  /** Fail the upload instead of streaming (offline is driven by the adapter's offline switch). */
  submitError?: "rate_limited"
  /** Start the mock offline, then come back after this many ms. */
  offlineForMs?: number
  script(input: ScenarioInput): ScriptStep[]
}

function ev<K extends TurnEventName>(
  after: number,
  event: K,
  data: TurnEventData[K],
): EventStep {
  return { after, event, data } as EventStep
}

/** Mock clip URLs are spoken by the dev speech stand-in (audio/devSpeech.ts). */
export function speechClip(lang: Lang, text: string): string {
  return `speech:${lang}:${encodeURIComponent(text)}`
}

const isVoice = (mode: Mode) => mode !== "english_text"
const answerLang = (mode: Mode): Lang => (mode === "twi_voice" ? "tw" : "en")

function resolveAnswer(input: ScenarioInput): FixtureAnswer {
  if (input.menuItemId) {
    const item = fallbackItems.find((i) => i.id === input.menuItemId)
    return findAnswer(item?.label_en ?? input.text)
  }
  return findAnswer(input.text)
}

/** Upload ack → ASR → echo-back → wait for confirmation. Voice question turns only. */
function heardSteps(
  input: ScenarioInput,
  answer: FixtureAnswer,
  heard: Partial<TurnEventData["heard"]> = {},
): ScriptStep[] {
  const lang = answerLang(input.mode)
  const band = heard.confidence_band ?? "implicit"
  return [
    ev(150, "accepted", { mode: input.mode, kind: input.kind }),
    ev(100, "stage", { stage: "asr", status: "start" }),
    ev(1100, "stage", { stage: "asr", status: "done" }),
    ev(50, "heard", {
      text: lang === "tw" ? answer.question.tw : answer.question.en,
      text_en: answer.question.en,
      lang,
      confidence: band === "implicit" ? 0.93 : 0.71,
      confidence_band: band,
      numeric_spans: [],
      corrections: [],
      ...heard,
    }),
    ev(600, "echo_audio", {
      clip_url: speechClip("en", `You asked: ${answer.question.en}`),
    }),
    ev(50, "awaiting_confirm", {
      implicit_allowed: band === "implicit",
      implicit_after_s: 5,
    }),
    { gate: "confirm" },
  ]
}

/** Working stages → sentences (text + audio per sentence) → citations → done. */
function answerSteps(
  input: ScenarioInput,
  answer: FixtureAnswer,
  opts: { audio?: "ok" | "fail"; slowMs?: number } = {},
): ScriptStep[] {
  const voice = isVoice(input.mode)
  const lang = answerLang(input.mode)
  const steps: ScriptStep[] = [
    ev(100, "working", { stages: ["guide", "answer"] }),
    ev(50, "stage", { stage: "retrieval", status: "start" }),
    ev(1400 + (opts.slowMs ?? 0), "stage", {
      stage: "retrieval",
      status: "done",
    }),
    ev(50, "stage", { stage: "llm", status: "start" }),
  ]
  if (answer.dose) {
    steps.push(
      ev(300, "notice", {
        kind: "chemical_disclaimer",
        text_key: "PR-ANS-03",
      }),
    )
  }
  answer.sentences.forEach((sentence, i) => {
    const seq = i + 1
    steps.push(
      ev(i === 0 ? 1200 : 450, "answer_text", {
        seq,
        lang: "en",
        text: sentence.en,
        kind: sentence.kind,
        citations: i === 0 ? answer.citations : [],
        guard_actions: sentence.kind === "dose" ? ["g_dose_verbatim"] : [],
      }),
    )
    if (lang === "tw") {
      steps.push(
        ev(250, "answer_text", {
          seq,
          lang: "tw",
          text: sentence.tw,
          kind: sentence.kind,
          citations: [],
          guard_actions: [],
        }),
      )
    }
    if (voice) {
      steps.push(
        ev(200, "answer_audio", {
          seq,
          lang,
          // Twi clips do not exist yet; the stand-in speaks the English pivot.
          clip_url:
            opts.audio === "fail"
              ? "speech:fail"
              : speechClip("en", sentence.en),
        }),
      )
    }
  })
  steps.push(ev(150, "stage", { stage: "llm", status: "done" }))
  steps.push(ev(50, "citations", { citations: answer.citations }))
  steps.push(
    ev(50, "done", {
      answer_id: `ans-${answer.id}-${Math.random().toString(36).slice(2, 8)}`,
      idk: false,
      clarify: false,
      timings: {},
    }),
  )
  return steps
}

/** Typed text, quick replies and menu choices skip ASR and echo-back. */
function needsEcho(input: ScenarioInput): boolean {
  return isVoice(input.mode) && input.kind === "question" && !input.text
}

function standard(
  input: ScenarioInput,
  answerOpts?: Parameters<typeof answerSteps>[2],
  heard?: Partial<TurnEventData["heard"]>,
  answer: FixtureAnswer = resolveAnswer(input),
): ScriptStep[] {
  const head = needsEcho(input)
    ? heardSteps(input, answer, heard)
    : [ev(150, "accepted", { mode: input.mode, kind: input.kind })]
  return [...head, ...answerSteps(input, answer, answerOpts)]
}

export const scenarios: Scenario[] = [
  {
    id: "happy",
    label: "Happy path",
    description:
      "Echo-back with implicit yes, guide checked, answer with source. Say No twice to reach the fallback menu.",
    script: (input) => standard(input),
  },
  {
    id: "explicit",
    label: "Explicit confirm",
    description:
      "Lower ASR confidence and a suggested correction: no implicit yes, you must tap Yes or No.",
    script: (input) =>
      standard(input, undefined, {
        confidence_band: "explicit",
        corrections: [{ from: "maze", to: "maize", kind: "suggested" }],
      }),
  },
  {
    id: "dose",
    label: "Dose answer",
    description:
      "Fertiliser answer: verbatim quote block, source and safety line (G-DOSE).",
    script: (input) =>
      standard(input, undefined, undefined, findAnswer("fertiliser")),
  },
  {
    id: "clarify",
    label: "Clarifying question",
    description: "One clarifying question with quick replies, then the answer.",
    script: (input) => {
      // The mockup's clarify is about fertiliser timing (mockups/J4 S05b).
      const answer = findAnswer("fertiliser")
      if (input.kind === "clarify_answer")
        return standard(input, undefined, undefined, answer)
      const head = needsEcho(input)
        ? heardSteps(input, answer)
        : [ev(150, "accepted", { mode: input.mode, kind: input.kind })]
      return [
        ...head,
        ev(900, "clarify", {
          ...clarifyFixture,
          text:
            input.mode === "twi_voice"
              ? clarifyFixture.text
              : clarifyFixture.text_en,
          audio_url: isVoice(input.mode)
            ? speechClip("en", clarifyFixture.text_en)
            : undefined,
          clarify_count: 1,
        }),
        ev(50, "done", { idk: false, clarify: true, timings: {} }),
      ]
    },
  },
  {
    id: "idk",
    label: "I don't know",
    description:
      "Weak evidence: honest IDK with scope and next steps (never an empty answer).",
    script: (input) => {
      const answer = resolveAnswer(input)
      const head = needsEcho(input)
        ? heardSteps(input, answer)
        : [ev(150, "accepted", { mode: input.mode, kind: input.kind })]
      return [
        ...head,
        ev(100, "working", { stages: ["guide", "answer"] }),
        ev(1500, "idk", { reason: "weak_evidence", ...idkFixture }),
        ev(50, "done", {
          answer_id: `ans-idk-${Date.now()}`,
          idk: true,
          clarify: false,
          timings: {},
        }),
      ]
    },
  },
  {
    id: "lang_mismatch",
    label: "Language mismatch",
    description:
      "ASR language-ID disagrees with the mode: offer to switch (S05h).",
    script: (input) => {
      // The farmer spoke the other language, so the transcript is in that language.
      const spoke = input.mode === "twi_voice" ? "en" : "tw"
      const answer = resolveAnswer(input)
      return standard(
        input,
        undefined,
        {
          text: spoke === "en" ? answer.question.en : answer.question.tw,
          lang: spoke,
          lid_mismatch: spoke,
          confidence_band: "explicit",
        },
        answer,
      )
    },
  },
  {
    id: "nothing_heard",
    label: "Nothing heard",
    description: "Empty capture: 'I did not hear anything' with Record again.",
    script: (input) => [
      ev(150, "accepted", { mode: input.mode, kind: input.kind }),
      ev(100, "stage", { stage: "asr", status: "start" }),
      ev(900, "error", {
        code: "nothing_heard",
        retryable: true,
        message_key: "PR-ERR-03",
      }),
    ],
  },
  {
    id: "offline",
    label: "Offline, then back",
    description:
      "Network is down for ~6 s: the question is kept and sent when it returns.",
    offlineForMs: 6000,
    script: (input) => standard(input),
  },
  {
    id: "slow",
    label: "Slow answer",
    description:
      "Retrieval takes ~32 s: 'still working', then the keep-waiting offer, then the answer.",
    script: (input) => standard(input, { slowMs: 31_000 }),
  },
  {
    id: "timeout",
    label: "Timeout",
    description:
      "No answer arrives: the 45 s ceiling ends the turn and keeps the recording.",
    script: (input) => {
      const answer = resolveAnswer(input)
      const head = needsEcho(input)
        ? heardSteps(input, answer)
        : [ev(150, "accepted", { mode: input.mode, kind: input.kind })]
      return [...head, ev(100, "working", { stages: ["guide", "answer"] })]
    },
  },
  {
    id: "tts_fail",
    label: "Audio fails",
    description:
      "Answer text arrives but audio cannot play: text stays, retry audio.",
    script: (input) => standard(input, { audio: "fail" }),
  },
  {
    id: "rate_limited",
    label: "Rate limited",
    description: "429 on upload: 'Too many questions right now'.",
    submitError: "rate_limited",
    script: () => [],
  },
  {
    id: "server_error",
    label: "Server error",
    description: "The turn fails after confirmation: retry card.",
    script: (input) => {
      const answer = resolveAnswer(input)
      const head = needsEcho(input)
        ? heardSteps(input, answer)
        : [ev(150, "accepted", { mode: input.mode, kind: input.kind })]
      return [
        ...head,
        ev(100, "working", { stages: ["guide", "answer"] }),
        ev(1200, "error", {
          code: "server",
          retryable: true,
          message_key: "PR-ERR-02",
        }),
      ]
    },
  },
]

export const DEFAULT_SCENARIO = "happy"

export function getScenario(id: string | undefined): Scenario {
  return scenarios.find((s) => s.id === id) ?? scenarios[0]
}

/** "Hear in Twi": Twi sentences and clips for an existing answer. */
export function renditionScript(answer: FixtureAnswer): EventStep[] {
  const steps: EventStep[] = []
  answer.sentences.forEach((sentence, i) => {
    steps.push(
      ev(i === 0 ? 900 : 300, "answer_text", {
        seq: i + 1,
        lang: "tw",
        text: sentence.tw,
        kind: sentence.kind,
        citations: [],
        guard_actions: [],
      }),
    )
    steps.push(
      ev(150, "answer_audio", {
        seq: i + 1,
        lang: "tw",
        clip_url: speechClip("en", sentence.en),
      }),
    )
  })
  steps.push(ev(50, "done", { idk: false, clarify: false, timings: {} }))
  return steps
}
