/**
 * The conversation turn state machine (P1-04 §3.1), as one pure reducer: (state, action) → state.
 * It is the single source of truth for what S05 shows. Side effects (recording, API calls, audio,
 * timers) live in useTurnDriver, which turns their results into actions.
 *
 * Voice: idle → listening → uploading → transcribing → echo_back/await_confirm → thinking →
 *        answering → rating → idle, with clarifying, fallback_menu, retry_wait and error branches.
 * Text:  idle → sending → thinking → answering → rating → idle (no echo-back).
 */

import type { Lang, Mode, RatingFace, TurnKind } from "@/api/contract"
import type {
  Citation,
  ConfirmDecisionLike,
  Correction,
  FallbackItem,
  TurnEvent,
  TurnEventData,
  WorkingStep,
} from "./types"

export type Phase =
  | "idle"
  | "listening"
  | "uploading"
  | "sending"
  | "retry_wait"
  | "transcribing"
  | "echo_back"
  | "await_confirm"
  | "reprompting"
  | "clarifying"
  | "thinking"
  | "answering"
  | "rating"
  | "fallback_menu"
  | "error"

export type ErrorKind =
  | "upload_failed"
  | "nothing_heard"
  | "timeout"
  | "rate_limited"
  | "server"

export type StepStatus = "pending" | "active" | "done"

export interface Sentence {
  seq: number
  lang: Lang
  text: string
  kind: TurnEventData["answer_text"]["kind"]
}

export interface QueuedClip {
  seq: number
  lang: Lang
  url: string
}

export type QuestionSource = "voice" | "typed" | "menu" | "quick_reply"

export interface Question {
  text: string
  textEn?: string
  lang: Lang
  corrections: Correction[]
  source: QuestionSource
}

export interface ActiveTurn {
  clientTurnId: string
  turnId?: string
  kind: TurnKind
  question?: Question
  echoClip?: string
  implicit?: { allowed: boolean; afterS: number }
  /** When the implicit yes fires (client clock); set once the echo has played. */
  implicitDeadline?: number
  workingSteps: WorkingStep[]
  steps: Partial<Record<WorkingStep, StepStatus>>
  sentences: Sentence[]
  /** Clips still to play, in order; consumed by the driver. */
  audioQueue: QueuedClip[]
  /** Every clip received for this answer, for "Hear again". */
  clips: QueuedClip[]
  citations: Citation[]
  notices: TurnEventData["notice"][]
  idk?: TurnEventData["idk"]
  clarify?: TurnEventData["clarify"]
  answerId?: string
  done: boolean
  lastEventId: number
  audioFailed: boolean
  audioStopped: boolean
  /** Length of the recording, for the offline bubble (S05f). */
  recordedMs?: number
}

export interface HistoryEntry {
  id: string
  question?: Question
  sentences: Sentence[]
  clips: QueuedClip[]
  citations: Citation[]
  notices: TurnEventData["notice"][]
  idk?: TurnEventData["idk"]
  clarify?: TurnEventData["clarify"]
  answerId?: string
  rating?: RatingFace
  interrupted: boolean
}

export interface ConversationState {
  mode: Mode
  phase: Phase
  turn?: ActiveTurn
  history: HistoryEntry[]
  error?: { kind: ErrorKind; retryable: boolean }
  fallbackItems?: FallbackItem[]
  /** After the 1st "no": the driver re-prompts and starts listening again. */
  reprompted: boolean
  stalled: boolean
  slowOffer: boolean
  rating?: { answerId: string; face?: RatingFace }
  /** Language-ID disagreed with the mode (S05h). */
  langOffer?: Lang
  /** The next turn answers a clarifying question (kind clarify_answer). */
  clarifyPending: boolean
  /** The question heard wrong twice, shown struck through above the fallback menu (S05c). */
  rejectedQuestion?: Question
  retryAttempt: number
}

export type Action =
  | { type: "RECORD_START" }
  | { type: "RECORD_CANCEL" }
  | { type: "RECORD_STOP"; clientTurnId: string; recordedMs?: number }
  | {
      type: "SEND"
      clientTurnId: string
      kind: TurnKind
      text: string
      source: Exclude<QuestionSource, "voice">
    }
  | { type: "SUBMITTED"; turnId: string }
  | { type: "SUBMIT_FAILED"; code: "offline" | "rate_limited" | "server" }
  | { type: "RETRYING" }
  | { type: "RESUBMIT"; clientTurnId: string }
  | { type: "SERVER"; event: TurnEvent }
  | { type: "CONFIRM"; decision: ConfirmDecisionLike }
  | { type: "IMPLICIT_ARMED"; deadline: number }
  | {
      type: "CLIP_FINISHED"
      result: "ended" | "stopped" | "blocked" | "failed"
    }
  | { type: "STALLED" }
  | { type: "SLOW" }
  | { type: "KEEP_WAITING" }
  | { type: "TIMEOUT" }
  | { type: "RATE"; face: RatingFace }
  | { type: "RATING_DONE" }
  | { type: "SKIP_RATING" }
  | { type: "DISMISS" }
  | { type: "DISMISS_LANG_OFFER" }
  | { type: "MODE_CHANGED"; mode: Mode }
  | { type: "RETRY_AUDIO"; clips: QueuedClip[] }

export function initialConversation(mode: Mode): ConversationState {
  return {
    mode,
    phase: "idle",
    history: [],
    reprompted: false,
    stalled: false,
    slowOffer: false,
    clarifyPending: false,
    retryAttempt: 0,
  }
}

export const isVoice = (mode: Mode) => mode !== "english_text"
export const spokenLang = (mode: Mode): Lang =>
  mode === "twi_voice" ? "tw" : "en"

/** Phases in which the server is working on the turn and the client shows progress. */
export const WORKING_PHASES: Phase[] = [
  "uploading",
  "sending",
  "transcribing",
  "thinking",
]

function newTurn(clientTurnId: string, kind: TurnKind): ActiveTurn {
  return {
    clientTurnId,
    kind,
    workingSteps: [],
    steps: {},
    sentences: [],
    audioQueue: [],
    clips: [],
    citations: [],
    notices: [],
    done: false,
    lastEventId: 0,
    audioFailed: false,
    audioStopped: false,
  }
}

/** Moves the active turn into history (if it has anything worth showing) and clears it. */
function archive(
  state: ConversationState,
  opts: { interrupted?: boolean; rating?: RatingFace } = {},
): ConversationState {
  const t = state.turn
  if (!t || (!t.question && t.sentences.length === 0 && !t.idk && !t.clarify)) {
    return { ...state, turn: undefined }
  }
  const entry: HistoryEntry = {
    id: t.turnId ?? t.clientTurnId,
    question: t.question,
    sentences: t.sentences,
    clips: t.clips,
    citations: t.citations,
    notices: t.notices,
    idk: t.idk,
    clarify: t.clarify,
    answerId: t.answerId,
    rating: opts.rating,
    interrupted: opts.interrupted ?? false,
  }
  return { ...state, turn: undefined, history: [...state.history, entry] }
}

function toIdle(state: ConversationState): ConversationState {
  return {
    ...state,
    phase: "idle",
    error: undefined,
    fallbackItems: undefined,
    stalled: false,
    slowOffer: false,
    rating: undefined,
    retryAttempt: 0,
    rejectedQuestion: undefined,
  }
}

/** Answering ends when the server is done and every queued clip has played (or audio failed). */
function maybeFinish(state: ConversationState): ConversationState {
  const t = state.turn
  if (!t?.done || t.clarify) return state
  if (state.phase !== "thinking" && state.phase !== "answering") return state
  if (t.audioQueue.length > 0) return state
  if (t.answerId) {
    return {
      ...state,
      phase: "rating",
      stalled: false,
      slowOffer: false,
      rating: { answerId: t.answerId },
    }
  }
  return toIdle(archive(state))
}

function withTurn(
  state: ConversationState,
  patch: Partial<ActiveTurn>,
): ConversationState {
  if (!state.turn) return state
  return { ...state, turn: { ...state.turn, ...patch } }
}

const STAGE_TO_STEP: Partial<Record<string, WorkingStep>> = {
  retrieval: "guide",
  plan: "guide",
  soil: "soil",
  weather: "weather",
  llm: "answer",
}

function onServerEvent(
  state: ConversationState,
  event: TurnEvent,
): ConversationState {
  const t = state.turn
  if (!t || (t.turnId && event.data.turn_id !== t.turnId)) return state
  if (event.id <= t.lastEventId) return state // replay after reconnect
  let next = withTurn(state, { lastEventId: event.id })
  const turn = next.turn as ActiveTurn
  // Any progress resets the "still working" cue (PR-WRK-05).
  next = { ...next, stalled: false }

  switch (event.event) {
    case "accepted":
      return next

    case "stage": {
      const { stage, status } = event.data
      if (stage === "asr" && status === "start" && next.phase === "uploading") {
        return { ...next, phase: "transcribing" }
      }
      const step = STAGE_TO_STEP[stage]
      if (!step) return next
      return withTurn(next, {
        steps: {
          ...turn.steps,
          [step]: status === "start" ? "active" : "done",
        },
      })
    }

    case "heard": {
      const d = event.data
      const question: Question = {
        text: d.text,
        textEn: d.text_en,
        lang: d.lang,
        corrections: d.corrections,
        source: turn.question?.source ?? "voice",
      }
      return {
        ...withTurn(next, { question }),
        phase: isVoice(next.mode) ? "echo_back" : next.phase,
        langOffer: d.lid_mismatch,
      }
    }

    case "echo_audio":
      return withTurn(next, { echoClip: event.data.clip_url })

    case "awaiting_confirm":
      return {
        ...withTurn(next, {
          implicit: {
            allowed: event.data.implicit_allowed,
            afterS: event.data.implicit_after_s,
          },
        }),
        phase: "await_confirm",
      }

    case "reprompt":
      return {
        ...toIdle({ ...next, turn: undefined }),
        reprompted: true,
      }

    case "fallback":
      return {
        ...next,
        turn: undefined,
        phase: "fallback_menu",
        fallbackItems: event.data.items ?? [],
        rejectedQuestion: turn.question,
      }

    case "clarify":
      return {
        ...withTurn(next, { clarify: event.data }),
        phase: "clarifying",
      }

    case "working":
      return {
        ...withTurn(next, { workingSteps: event.data.stages }),
        phase: next.phase === "answering" ? "answering" : "thinking",
      }

    case "answer_text": {
      const d = event.data
      const sentences = [
        ...turn.sentences.filter(
          (s) => !(s.seq === d.seq && s.lang === d.lang),
        ),
        { seq: d.seq, lang: d.lang, text: d.text, kind: d.kind },
      ].sort((a, b) => a.seq - b.seq)
      const citations = [...turn.citations]
      for (const c of d.citations) {
        if (!citations.some((x) => x.chunk_id === c.chunk_id)) citations.push(c)
      }
      return {
        ...withTurn(next, { sentences, citations }),
        phase: "answering",
        slowOffer: false,
      }
    }

    case "answer_audio": {
      const d = event.data
      if (!isVoice(next.mode) || d.lang !== spokenLang(next.mode)) return next
      const clip = { seq: d.seq, lang: d.lang, url: d.clip_url }
      return withTurn(next, {
        clips: [...turn.clips, clip],
        audioQueue: turn.audioStopped
          ? turn.audioQueue
          : [...turn.audioQueue, clip],
      })
    }

    case "citations": {
      const citations = [...turn.citations]
      for (const c of event.data.citations) {
        if (!citations.some((x) => x.chunk_id === c.chunk_id)) citations.push(c)
      }
      return withTurn(next, { citations })
    }

    case "notice":
      return withTurn(next, { notices: [...turn.notices, event.data] })

    case "idk":
      return { ...withTurn(next, { idk: event.data }), phase: "answering" }

    case "cancelled":
      // user_no is followed by reprompt/fallback, handled above.
      if (event.data.reason === "user_no") return next
      if (next.phase === "idle" || next.phase === "listening") return next
      return toIdle(archive(next, { interrupted: true }))

    case "error": {
      const code = event.data.code
      if (code === "tts_fail") return withTurn(next, { audioFailed: true })
      const kind: ErrorKind =
        code === "nothing_heard" ||
        code === "timeout" ||
        code === "rate_limited"
          ? code
          : code === "upload_failed"
            ? "upload_failed"
            : "server"
      return {
        ...next,
        phase: "error",
        error: { kind, retryable: event.data.retryable },
      }
    }

    case "done":
      return maybeFinish(
        withTurn(next, { done: true, answerId: event.data.answer_id }),
      )
  }
}

/** Before a new question: keep what the current turn produced in history, then drop it. */
function leaveCurrentTurn(state: ConversationState): ConversationState {
  switch (state.phase) {
    case "thinking":
    case "answering":
      // A new question while the previous one is still running interrupts it (ADR-20).
      return archive(state, { interrupted: true })
    case "rating":
    case "clarifying":
      return archive(state, { rating: state.rating?.face })
    default:
      return { ...state, turn: undefined }
  }
}

export function turnReducer(
  state: ConversationState,
  action: Action,
): ConversationState {
  switch (action.type) {
    case "RECORD_START":
      return {
        ...toIdle(leaveCurrentTurn(state)),
        phase: "listening",
        reprompted: false,
        langOffer: undefined,
        clarifyPending: state.phase === "clarifying" || state.clarifyPending,
      }

    case "RECORD_CANCEL":
      return state.phase === "listening" ? toIdle(state) : state

    case "RECORD_STOP":
      if (state.phase !== "listening") return state
      return {
        ...state,
        phase: "uploading",
        turn: {
          ...newTurn(
            action.clientTurnId,
            state.clarifyPending ? "clarify_answer" : "question",
          ),
          recordedMs: action.recordedMs,
        },
      }

    case "SEND": {
      return {
        ...toIdle(leaveCurrentTurn(state)),
        phase: "sending",
        reprompted: false,
        turn: {
          ...newTurn(action.clientTurnId, action.kind),
          question: {
            text: action.text,
            textEn: action.text,
            lang: "en",
            corrections: [],
            source: action.source,
          },
        },
      }
    }

    case "SUBMITTED": {
      if (!state.turn) return state
      const voiceQuestion =
        state.phase === "uploading" && state.turn.kind === "question"
      return {
        ...withTurn(state, { turnId: action.turnId }),
        phase: voiceQuestion ? "transcribing" : "thinking",
        clarifyPending: false,
        retryAttempt: 0,
      }
    }

    case "SUBMIT_FAILED":
      if (action.code === "offline") return { ...state, phase: "retry_wait" }
      return {
        ...state,
        phase: "error",
        error: {
          kind:
            action.code === "rate_limited" ? "rate_limited" : "upload_failed",
          retryable: action.code !== "rate_limited",
        },
      }

    case "RETRYING":
      if (state.phase !== "retry_wait" || !state.turn) return state
      return {
        ...state,
        phase:
          state.turn.question?.source && state.turn.question.source !== "voice"
            ? "sending"
            : "uploading",
        retryAttempt: state.retryAttempt + 1,
      }

    case "RESUBMIT": {
      // Retry after an error: same question, fresh turn id.
      const prev = state.turn
      return {
        ...state,
        phase:
          prev?.question && prev.question.source !== "voice"
            ? "sending"
            : "uploading",
        error: undefined,
        stalled: false,
        slowOffer: false,
        turn: {
          ...newTurn(action.clientTurnId, prev?.kind ?? "question"),
          question:
            prev?.question?.source !== "voice" ? prev?.question : undefined,
        },
      }
    }

    case "SERVER":
      return onServerEvent(state, action.event)

    case "CONFIRM": {
      // A late "no" is accepted while thinking, until done (P1-05 §4.2 confirm).
      const lateNo = state.phase === "thinking" && action.decision === "no"
      if (
        state.phase !== "await_confirm" &&
        state.phase !== "echo_back" &&
        !lateNo
      ) {
        return state
      }
      return action.decision === "yes"
        ? {
            ...withTurn(state, { implicitDeadline: undefined }),
            phase: "thinking",
          }
        : {
            ...withTurn(state, { implicitDeadline: undefined }),
            phase: "reprompting",
          }
    }

    case "IMPLICIT_ARMED":
      return withTurn(state, { implicitDeadline: action.deadline })

    case "CLIP_FINISHED": {
      const t = state.turn
      if (!t || t.audioQueue.length === 0) return state
      const stopped = action.result === "stopped"
      const failed = action.result === "failed" || action.result === "blocked"
      const next = withTurn(state, {
        audioQueue: stopped || failed ? [] : t.audioQueue.slice(1),
        audioStopped: t.audioStopped || stopped,
        audioFailed: t.audioFailed || failed,
      })
      return maybeFinish(next)
    }

    case "RETRY_AUDIO":
      return withTurn(state, {
        audioQueue: action.clips,
        audioFailed: false,
        audioStopped: false,
      })

    case "STALLED":
      return WORKING_PHASES.includes(state.phase)
        ? { ...state, stalled: true }
        : state

    case "SLOW":
      return WORKING_PHASES.includes(state.phase)
        ? { ...state, slowOffer: true }
        : state

    case "KEEP_WAITING":
      return { ...state, slowOffer: false }

    case "TIMEOUT":
      if (
        !WORKING_PHASES.includes(state.phase) &&
        state.phase !== "retry_wait"
      ) {
        return state
      }
      return {
        ...state,
        phase: "error",
        error: { kind: "timeout", retryable: true },
      }

    case "RATE":
      if (state.phase !== "rating" || !state.rating) return state
      return { ...state, rating: { ...state.rating, face: action.face } }

    case "RATING_DONE":
    case "SKIP_RATING":
      if (state.phase !== "rating") return state
      return toIdle(archive(state, { rating: state.rating?.face }))

    case "DISMISS":
      return { ...toIdle(archive(state)), clarifyPending: false }

    case "DISMISS_LANG_OFFER":
      return { ...state, langOffer: undefined }

    case "MODE_CHANGED": {
      const switched = { ...state, mode: action.mode, langOffer: undefined }
      return state.phase === "error" || state.phase === "fallback_menu"
        ? toIdle(switched)
        : switched
    }
  }
}
