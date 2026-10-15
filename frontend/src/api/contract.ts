/**
 * REST request and response types for the /v1 API, hand-written from P1-05 §4.2
 * (docs/nexus/phase-1/system-architecture.md). When the backend ships these routes, regenerate the
 * client with `bun run generate-client` and re-export the generated types from here, so callers do
 * not change.
 */

import type { Citation } from "./events"

export type Mode = "twi_voice" | "english_voice" | "english_text"
export type Lang = "tw" | "en"
export type ConsentMethod = "tap" | "voice"
export type ConsentLayer = "service" | "memory" | "improve"
export type Cohort = "unknown" | "rater" | "team"
export type TurnKind =
  | "question"
  | "clarify_answer"
  | "menu_choice"
  | "rating_comment"

export interface User {
  id: string
  mode: Mode
  role: "farmer" | "rater" | "operator" | "admin"
  phone_last4?: string
}

export interface ProvisionalSessionRequest {
  turnstile_token: string
  mode: Mode
  age: { is_18_or_older: true }
  consent: {
    version: string
    layers: { service: true }
    method: ConsentMethod
  }
  invite_token?: string
}

export interface ProvisionalSessionResponse {
  user: { id: string; cohort: Cohort }
  limits: { turns_left: number }
}

export interface ConsentText {
  version: string
  layers: ConsentLayer[]
  /** Short bullet points of the layer-1 summary (≤ 80 words in text mode). */
  summary: string[]
  controller: string
  full_text_url: string
  audio_urls: Partial<Record<Lang, string>>
}

export interface RecordConsentRequest {
  version: string
  mode: Mode
  layers: Partial<Record<ConsentLayer, boolean>>
  method: ConsentMethod
  evidence_transcript?: string
}

export interface OtpRequestRequest {
  phone: string
  turnstile_token: string
}

export interface OtpRequestResponse {
  request_id: string
  resend_after_s: number
  webotp: boolean
}

export interface OtpVerifyRequest {
  request_id: string
  code: string
}

export interface OtpVerifyResponse {
  user: User
  merged_provisional: boolean
  needs: { age: boolean; consent: ConsentLayer[] }
}

export interface Me {
  user: User
  consent: Partial<Record<ConsentLayer, boolean>>
  farm?: { town?: string; crops: string[] }
}

export interface StartConversationResponse {
  conversation_id: string
}

export interface SubmitTurnRequest {
  conversation_id: string
  mode: Mode
  kind: TurnKind
  /** Client clock when the recording stopped, for D5 timings. */
  t_audio_end_client?: number
  menu_item_id?: string
  audio?: Blob
  text?: string
}

export interface SubmitTurnResponse {
  turn_id: string
  events_url: string
}

export type ConfirmDecision = "yes" | "no"
export type ConfirmMethod = "tap" | "voice" | "implicit_timeout"

export interface ConfirmRequest {
  decision: ConfirmDecision
  method: ConfirmMethod
}

export type RatingFace = 1 | 2 | 3

export interface RatingRequest {
  face: RatingFace
  comment_text?: string
}

export interface RenditionResponse {
  rendition_id: string
  events_url: string
}

export interface MemoryItem {
  id: string
  summary_en: string
  summary_tw_audio_url?: string
  created_at: string
  /** Groups the recap rows (S05e icons). Proposed addition to P1-05 §4.2. */
  kind?: "farm" | "problem" | "crop" | "other"
}

export interface ClientTimings {
  stop_ts?: number
  feedback_ts?: number
  echo_audio_ts?: number
  first_answer_audio_ts?: number
  answer_complete_ts?: number
}

/** Errors the adapters throw. UI code maps `code` to a recovery state, never shows `message`. */
export class ApiError extends Error {
  constructor(
    readonly code:
      | "offline"
      | "rate_limited"
      | "server"
      | "otp_wrong"
      | "otp_expired"
      | "otp_locked"
      | "not_found"
      | "forbidden"
      | "not_implemented",
    readonly retryable: boolean,
    message?: string,
    readonly retryAfterS?: number,
  ) {
    super(message ?? code)
    this.name = "ApiError"
  }
}

// ---- Team views (P1-05 §4.2 /v1/admin/*, roles rater / operator; P1-04 S10, S11) ----------

/** Where a turn came from: a field session with the team, or live use. */
export type TurnSource = "field" | "live"

export type AnswerKind = "answer" | "dose" | "idk"

/** S10: one turn to score, with everything the rater compares side by side. */
export interface RaterItem {
  id: string
  turn_ref: string
  mode: Mode
  topic: string
  kind: AnswerKind
  question_audio_url?: string
  answer_audio_url?: string
  question_duration_s?: number
  answer_duration_s?: number
  transcript: string
  transcript_lang: Lang
  asr_confidence?: number
  pivot_en: string
  /** English pivot of the answer as it was given. */
  answer_en: string
  citations: Citation[]
}

/** GET /v1/admin/rater/items: the rater's current batch. */
export interface RaterBatch {
  batch_id: string
  /** Pseudonymous rater label, e.g. "R-07". */
  rater_label: string
  total: number
  done: number
  /** Items not yet scored, in order. */
  items: RaterItem[]
  /** Captured once per rater (P1-04 S10); missing until the rater gives it. */
  profile?: RaterProfile
}

export interface RaterProfile {
  dialect: string
  age_band: string
}

/** POST /v1/admin/rater/items/{id}/scores. Each score is 1 to 5. */
export interface RaterScores {
  relevance: number
  correctness: number
  groundedness: number
  /** Spoken Twi is easy to understand; Twi voice answers only. */
  intelligible?: number
  note?: string
  claims?: { idx: number; supported: boolean }[]
}

export type TagReason =
  | "asr_misheard"
  | "retrieval_missed"
  | "answer_wrong"
  | "out_of_scope"
  | "twi_unclear"

export interface TurnTag {
  reason: TagReason
  note?: string
  tagged_at: string
}

/** GET /v1/admin/turns filters. The three flags combine with OR; none set means all turns. */
export interface AdminTurnFilters {
  low_rating?: boolean
  idk?: boolean
  low_confidence?: boolean
  mode?: Mode
  dialect?: string
  source?: TurnSource
}

export interface AdminTurnSummary {
  id: string
  turn_ref: string
  topic: string
  mode: Mode
  source: TurnSource
  dialect?: string
  rating?: RatingFace
  idk: boolean
  asr_confidence?: number
  /** Short label for the list, e.g. "Dose", "Out of scope". */
  label?: string
  tag?: TurnTag
  created_at: string
}

/** GET /v1/admin/turns/{id}. Audio only where consent layer 3 allows it, or `is_test`. */
export interface AdminTurnDetail extends AdminTurnSummary {
  transcript: string
  transcript_lang: Lang
  pivot_en?: string
  answer_en: string
  comment?: string
  citations: Citation[]
  audio: { status: "kept"; url: string } | { status: "not_kept" | "typed" }
  soil?: { reading: string; age: string; simulated: boolean }
  weather?: { used: boolean; summary?: string }
}
