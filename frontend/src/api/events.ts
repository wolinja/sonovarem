/**
 * Per-turn SSE events, from P1-05 §4.3. Each SSE frame is `id: <seq>`, `event: <name>`,
 * `data: <JSON>`; this union is that frame after parsing. The mock adapter emits exactly these
 * shapes, so the HTTP adapter only has to parse EventSource frames into them.
 */

import type { Lang, Mode, TurnKind } from "./contract"

export type StageName =
  | "asr"
  | "mt_in"
  | "plan"
  | "retrieval"
  | "soil"
  | "weather"
  | "llm"
  | "mt_out"
  | "tts"

/** The named steps the farmer sees in StageProgress after confirmation (P1-04 §3.1 THINKING). */
export type WorkingStep = "guide" | "soil" | "weather" | "answer"

export type ConfidenceBand = "reject" | "explicit" | "implicit"

export type SentenceKind = "restate" | "advice" | "dose" | "safety" | "tool"

export interface Citation {
  chunk_id: string
  label_spoken: string
  publisher: string
  title: string
  date: string
  passage: string
  url?: string
  /** Page in the source. Proposed addition to P1-05 §4.3 (the S05 text mockup cites it). */
  page?: string
}

export interface Correction {
  from: string
  to: string
  kind: "applied" | "suggested"
}

export interface FallbackItem {
  id: string
  audio_key: string
  label_en: string
  /** Icon for the menu card. Proposed addition to P1-05 §4.3 (mockups/J4 S05c). */
  icon?: string
}

export type TurnErrorCode =
  | "nothing_heard"
  | "upload_failed"
  | "timeout"
  | "rate_limited"
  | "tts_fail"
  | "server"

export interface TurnEventData {
  accepted: { mode: Mode; kind: TurnKind }
  stage: { stage: StageName; status: "start" | "done" }
  working: { stages: WorkingStep[] }
  heard: {
    text: string
    /** English pivot of a Twi transcript, for "Show in English". */
    text_en?: string
    lang: Lang
    confidence: number
    confidence_band: ConfidenceBand
    numeric_spans: string[]
    lid_mismatch?: Lang
    corrections: Correction[]
  }
  echo_audio: { clip_url: string }
  awaiting_confirm: { implicit_allowed: boolean; implicit_after_s: number }
  reprompt: { prompt_key: string }
  clarify: {
    slot: string
    text: string
    text_en: string
    audio_url?: string
    quick_replies: string[]
    clarify_count: number
    /** Why the answer depends on it (S05b). Proposed addition to P1-05 §4.3. */
    reason_en?: string
  }
  answer_text: {
    seq: number
    lang: Lang
    text: string
    kind: SentenceKind
    citations: Citation[]
    guard_actions: string[]
  }
  answer_audio: { seq: number; lang: Lang; clip_url: string }
  citations: { citations: Citation[] }
  notice: {
    kind:
      | "simulated_soil"
      | "stale_soil"
      | "chemical_disclaimer"
      | "general_guidance_zone"
    text_key: string
  }
  idk: {
    reason:
      | "weak_evidence"
      | "model_abstained"
      | "guards_removed"
      | "out_of_scope"
    can_help_with: string[]
    next_steps: string[]
  }
  fallback: {
    kind: "menu" | "text_only" | "english_voice"
    items?: FallbackItem[]
  }
  cancelled: {
    reason: "new_turn" | "user_no" | "user_cancel"
    released_seq: number
  }
  error: { code: TurnErrorCode; retryable: boolean; message_key: string }
  done: {
    answer_id?: string
    idk: boolean
    clarify: boolean
    timings: Record<string, number>
  }
}

export type TurnEventName = keyof TurnEventData

export type TurnEvent = {
  [K in TurnEventName]: {
    id: number
    event: K
    data: TurnEventData[K] & { turn_id: string; ts: number }
  }
}[TurnEventName]

export type TurnEventOf<K extends TurnEventName> = Extract<
  TurnEvent,
  { event: K }
>

/** Rendition ("Hear in Twi") streams reuse the answer events. */
export type RenditionEvent = TurnEventOf<
  "answer_text" | "answer_audio" | "done" | "error"
>
