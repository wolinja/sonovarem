import { describe, expect, it } from "vitest"
import type { TurnEvent, TurnEventData, TurnEventName } from "@/api/events"
import {
  type Action,
  type ConversationState,
  initialConversation,
  turnReducer,
} from "./turnMachine"

const TURN = "turn-1"
let seq = 0

function server<K extends TurnEventName>(
  event: K,
  data: TurnEventData[K],
): Action {
  seq++
  return {
    type: "SERVER",
    event: {
      id: seq,
      event,
      data: { ...data, turn_id: TURN, ts: 0 },
    } as TurnEvent,
  }
}

function run(
  state: ConversationState,
  ...actions: Action[]
): ConversationState {
  return actions.reduce(turnReducer, state)
}

const heard = (overrides: Partial<TurnEventData["heard"]> = {}) =>
  server("heard", {
    text: "[tw]",
    text_en: "When should I plant maize?",
    lang: "tw",
    confidence: 0.9,
    confidence_band: "implicit",
    numeric_spans: [],
    corrections: [],
    ...overrides,
  })

const sentence = (n: number, lang: "en" | "tw" = "tw") =>
  server("answer_text", {
    seq: n,
    lang,
    text: `s${n}`,
    kind: "advice",
    citations: [],
    guard_actions: [],
  })

function toAwaitConfirm(): ConversationState {
  seq = 0
  return run(
    initialConversation("twi_voice"),
    { type: "RECORD_START" },
    { type: "RECORD_STOP", clientTurnId: "c1" },
    { type: "SUBMITTED", turnId: TURN },
    heard(),
    server("echo_audio", { clip_url: "speech:en:x" }),
    server("awaiting_confirm", { implicit_allowed: true, implicit_after_s: 5 }),
  )
}

describe("voice turn: happy path", () => {
  it("goes listening → uploading → transcribing → echo → await_confirm", () => {
    seq = 0
    let s = initialConversation("twi_voice")
    s = turnReducer(s, { type: "RECORD_START" })
    expect(s.phase).toBe("listening")
    s = turnReducer(s, { type: "RECORD_STOP", clientTurnId: "c1" })
    expect(s.phase).toBe("uploading")
    s = turnReducer(s, { type: "SUBMITTED", turnId: TURN })
    expect(s.phase).toBe("transcribing")
    s = turnReducer(s, heard())
    expect(s.phase).toBe("echo_back")
    expect(s.turn?.question?.textEn).toBe("When should I plant maize?")
    s = run(
      s,
      server("awaiting_confirm", {
        implicit_allowed: true,
        implicit_after_s: 5,
      }),
    )
    expect(s.phase).toBe("await_confirm")
    expect(s.turn?.implicit).toEqual({ allowed: true, afterS: 5 })
  })

  it("yes → thinking → answering, then rating once audio has played", () => {
    let s = run(
      toAwaitConfirm(),
      { type: "CONFIRM", decision: "yes" },
      server("working", { stages: ["guide", "answer"] }),
      server("stage", { stage: "retrieval", status: "start" }),
    )
    expect(s.phase).toBe("thinking")
    expect(s.turn?.steps.guide).toBe("active")
    s = run(
      s,
      sentence(1, "en"),
      sentence(1, "tw"),
      server("answer_audio", { seq: 1, lang: "tw", clip_url: "a1" }),
      server("answer_audio", { seq: 1, lang: "en", clip_url: "ignored" }),
      server("done", {
        answer_id: "ans-1",
        idk: false,
        clarify: false,
        timings: {},
      }),
    )
    expect(s.phase).toBe("answering")
    expect(s.turn?.sentences).toHaveLength(2)
    // Only the spoken language is queued.
    expect(s.turn?.audioQueue.map((c) => c.url)).toEqual(["a1"])
    s = turnReducer(s, { type: "CLIP_FINISHED", result: "ended" })
    expect(s.phase).toBe("rating")
    expect(s.rating).toEqual({ answerId: "ans-1" })
    s = run(s, { type: "RATE", face: 1 }, { type: "RATING_DONE" })
    expect(s.phase).toBe("idle")
    expect(s.history).toHaveLength(1)
    expect(s.history[0].rating).toBe(1)
  })

  it("stopping audio clears the queue and still reaches rating", () => {
    let s = run(
      toAwaitConfirm(),
      { type: "CONFIRM", decision: "yes" },
      sentence(1),
      server("answer_audio", { seq: 1, lang: "tw", clip_url: "a1" }),
      server("answer_audio", { seq: 2, lang: "tw", clip_url: "a2" }),
      server("done", {
        answer_id: "ans-1",
        idk: false,
        clarify: false,
        timings: {},
      }),
    )
    s = turnReducer(s, { type: "CLIP_FINISHED", result: "stopped" })
    expect(s.turn?.audioQueue).toEqual([])
    expect(s.phase).toBe("rating")
  })

  it("audio failure keeps the text and marks audioFailed (tts_fail)", () => {
    const s = run(
      toAwaitConfirm(),
      { type: "CONFIRM", decision: "yes" },
      sentence(1),
      server("answer_audio", { seq: 1, lang: "tw", clip_url: "speech:fail" }),
      { type: "CLIP_FINISHED", result: "failed" },
    )
    expect(s.turn?.audioFailed).toBe(true)
    expect(s.turn?.sentences).toHaveLength(1)
  })
})

describe("echo-back rejection", () => {
  it("first no → reprompting → idle with reprompted", () => {
    let s = turnReducer(toAwaitConfirm(), { type: "CONFIRM", decision: "no" })
    expect(s.phase).toBe("reprompting")
    s = run(
      s,
      server("reprompt", { prompt_key: "PR-ECH-03" }),
      server("cancelled", { reason: "user_no", released_seq: 0 }),
    )
    expect(s.phase).toBe("idle")
    expect(s.reprompted).toBe(true)
    expect(s.history).toHaveLength(0)
  })

  it("a late no during thinking is accepted", () => {
    const s = run(
      toAwaitConfirm(),
      { type: "CONFIRM", decision: "yes" },
      { type: "CONFIRM", decision: "no" },
    )
    expect(s.phase).toBe("reprompting")
  })

  it("a late yes during thinking is ignored", () => {
    const thinking = run(toAwaitConfirm(), { type: "CONFIRM", decision: "yes" })
    expect(turnReducer(thinking, { type: "CONFIRM", decision: "yes" })).toBe(
      thinking,
    )
  })

  it("second no → fallback menu", () => {
    const s = run(
      toAwaitConfirm(),
      { type: "CONFIRM", decision: "no" },
      server("fallback", {
        kind: "menu",
        items: [{ id: "f1", audio_key: "PR-FBM-01", label_en: "Q1" }],
      }),
    )
    expect(s.phase).toBe("fallback_menu")
    expect(s.fallbackItems).toHaveLength(1)
    // S05c shows the rejected transcript struck through, until the next question.
    expect(s.rejectedQuestion?.text).toBe("[tw]")
    const next = turnReducer(s, { type: "RECORD_START" })
    expect(next.rejectedQuestion).toBeUndefined()
  })

  it("keeps the recording length for the offline bubble", () => {
    const s = run(
      initialConversation("twi_voice"),
      { type: "RECORD_START" },
      { type: "RECORD_STOP", clientTurnId: "c1", recordedMs: 9000 },
      { type: "SUBMIT_FAILED", code: "offline" },
    )
    expect(s.phase).toBe("retry_wait")
    expect(s.turn?.recordedMs).toBe(9000)
  })

  it("a menu choice goes straight to thinking (no ASR, no echo)", () => {
    seq = 0
    let s = run(
      { ...initialConversation("twi_voice"), phase: "fallback_menu" },
      {
        type: "SEND",
        clientTurnId: "c2",
        kind: "menu_choice",
        text: "Q1",
        source: "menu",
      },
    )
    expect(s.phase).toBe("sending")
    s = turnReducer(s, { type: "SUBMITTED", turnId: TURN })
    expect(s.phase).toBe("thinking")
  })
})

describe("text mode", () => {
  it("sending → thinking → answering → rating without audio", () => {
    seq = 0
    const s = run(
      initialConversation("english_text"),
      {
        type: "SEND",
        clientTurnId: "c1",
        kind: "question",
        text: "When should I plant maize?",
        source: "typed",
      },
      { type: "SUBMITTED", turnId: TURN },
      server("working", { stages: ["guide", "answer"] }),
      sentence(1, "en"),
      server("answer_audio", { seq: 1, lang: "en", clip_url: "a1" }),
      server("done", {
        answer_id: "ans-1",
        idk: false,
        clarify: false,
        timings: {},
      }),
    )
    expect(s.turn?.audioQueue).toEqual([])
    expect(s.phase).toBe("rating")
  })
})

describe("clarifying", () => {
  it("clarify → voice answer is submitted as clarify_answer", () => {
    let s = run(
      toAwaitConfirm(),
      { type: "CONFIRM", decision: "yes" },
      server("clarify", {
        slot: "season",
        text: "?",
        text_en: "?",
        quick_replies: ["A", "B"],
        clarify_count: 1,
      }),
      server("done", { idk: false, clarify: true, timings: {} }),
    )
    expect(s.phase).toBe("clarifying")
    s = run(
      s,
      { type: "RECORD_START" },
      { type: "RECORD_STOP", clientTurnId: "c3" },
    )
    expect(s.turn?.kind).toBe("clarify_answer")
    expect(s.history.at(-1)?.clarify?.slot).toBe("season")
    s = turnReducer(s, { type: "SUBMITTED", turnId: "turn-2" })
    expect(s.phase).toBe("thinking")
    expect(s.clarifyPending).toBe(false)
  })
})

describe("failures and timers", () => {
  it("offline upload → retry_wait → retrying", () => {
    let s = run(
      initialConversation("twi_voice"),
      { type: "RECORD_START" },
      { type: "RECORD_STOP", clientTurnId: "c1" },
      { type: "SUBMIT_FAILED", code: "offline" },
    )
    expect(s.phase).toBe("retry_wait")
    s = turnReducer(s, { type: "RETRYING" })
    expect(s.phase).toBe("uploading")
    expect(s.retryAttempt).toBe(1)
  })

  it("rate limited is not retryable", () => {
    const s = run(
      initialConversation("english_text"),
      {
        type: "SEND",
        clientTurnId: "c1",
        kind: "question",
        text: "x",
        source: "typed",
      },
      { type: "SUBMIT_FAILED", code: "rate_limited" },
    )
    expect(s.error).toEqual({ kind: "rate_limited", retryable: false })
  })

  it("stalled and slow cues reset on progress; timeout ends the turn", () => {
    let s = run(
      toAwaitConfirm(),
      { type: "CONFIRM", decision: "yes" },
      { type: "STALLED" },
    )
    expect(s.stalled).toBe(true)
    s = turnReducer(s, server("stage", { stage: "retrieval", status: "start" }))
    expect(s.stalled).toBe(false)
    s = run(s, { type: "SLOW" })
    expect(s.slowOffer).toBe(true)
    s = run(s, { type: "TIMEOUT" })
    expect(s.phase).toBe("error")
    expect(s.error?.kind).toBe("timeout")
  })

  it("server errors map to recovery kinds", () => {
    const s = turnReducer(
      { ...toAwaitConfirm(), phase: "transcribing" },
      server("error", {
        code: "nothing_heard",
        retryable: true,
        message_key: "PR-ERR-03",
      }),
    )
    expect(s.error?.kind).toBe("nothing_heard")
  })

  it("timers do nothing outside working phases", () => {
    const s = run(
      initialConversation("twi_voice"),
      { type: "TIMEOUT" },
      { type: "STALLED" },
    )
    expect(s.phase).toBe("idle")
    expect(s.stalled).toBe(false)
  })
})

describe("interruptions and replay", () => {
  it("a new recording during answering archives the turn as interrupted", () => {
    const s = run(
      toAwaitConfirm(),
      { type: "CONFIRM", decision: "yes" },
      sentence(1),
      { type: "RECORD_START" },
    )
    expect(s.phase).toBe("listening")
    expect(s.history.at(-1)?.interrupted).toBe(true)
    expect(s.history.at(-1)?.sentences).toHaveLength(1)
  })

  it("replayed events (id ≤ lastEventId) are ignored", () => {
    const s = toAwaitConfirm()
    const replay: Action = {
      type: "SERVER",
      event: {
        id: 1,
        event: "reprompt",
        data: { prompt_key: "x", turn_id: TURN, ts: 0 },
      },
    }
    expect(turnReducer(s, replay)).toBe(s)
  })

  it("events for another turn are ignored", () => {
    const s = toAwaitConfirm()
    const other: Action = {
      type: "SERVER",
      event: {
        id: 99,
        event: "reprompt",
        data: { prompt_key: "x", turn_id: "other", ts: 0 },
      },
    }
    expect(turnReducer(s, other)).toBe(s)
  })

  it("language mismatch raises the switch offer", () => {
    seq = 0
    const s = run(
      initialConversation("twi_voice"),
      { type: "RECORD_START" },
      { type: "RECORD_STOP", clientTurnId: "c1" },
      { type: "SUBMITTED", turnId: TURN },
      heard({ lid_mismatch: "en" }),
    )
    expect(s.langOffer).toBe("en")
  })
})
