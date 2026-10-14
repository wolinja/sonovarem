/**
 * REST request and response types for the /v1 API, hand-written from P1-05 §4.2
 * (docs/nexus/phase-1/system-architecture.md). When the backend ships these routes, regenerate the
 * client with `bun run generate-client` and re-export the generated types from here, so callers do
 * not change.
 */

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
      | "not_implemented",
    readonly retryable: boolean,
    message?: string,
    readonly retryAfterS?: number,
  ) {
    super(message ?? code)
    this.name = "ApiError"
  }
}
