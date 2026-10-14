/**
 * The one interface the UI talks to. Adapters: `mock/` (in-memory, scripted) now, `http/` (REST +
 * EventSource) when the backend lands. Method names follow the /v1 routes in P1-05 §4.2.
 */

import type {
  ClientTimings,
  ConfirmRequest,
  ConsentLayer,
  ConsentText,
  Me,
  MemoryItem,
  Mode,
  OtpRequestRequest,
  OtpRequestResponse,
  OtpVerifyRequest,
  OtpVerifyResponse,
  ProvisionalSessionRequest,
  ProvisionalSessionResponse,
  RatingRequest,
  RecordConsentRequest,
  RenditionResponse,
  StartConversationResponse,
  SubmitTurnRequest,
  SubmitTurnResponse,
} from "./contract"
import type { RenditionEvent, TurnEvent } from "./events"

export type Unsubscribe = () => void

export interface StreamOptions {
  /** Resume after a reconnect; the server replays events after this id. */
  lastEventId?: number
}

export interface SonovaremApi {
  sessions: {
    /** POST /v1/sessions/provisional: pre-OTP session after age gate + layer-1 consent. */
    provisional(
      req: ProvisionalSessionRequest,
    ): Promise<ProvisionalSessionResponse>
    /** POST /v1/sessions/warm: fire-and-forget; never throws. */
    warm(mode: Mode): Promise<void>
  }
  consent: {
    current(mode: Mode): Promise<ConsentText>
    record(req: RecordConsentRequest): Promise<{ consent_id: string }>
    revoke(layer: ConsentLayer): Promise<void>
  }
  auth: {
    requestOtp(req: OtpRequestRequest): Promise<OtpRequestResponse>
    verifyOtp(req: OtpVerifyRequest): Promise<OtpVerifyResponse>
    logout(): Promise<void>
  }
  me: {
    get(): Promise<Me>
    update(patch: { mode?: Mode }): Promise<Me>
    remove(): Promise<{ deletion_request_id: string }>
  }
  memory: {
    list(): Promise<MemoryItem[]>
    markWrong(id: string): Promise<void>
    forget(id: string): Promise<void>
    forgetAll(): Promise<void>
  }
  conversations: {
    start(mode: Mode): Promise<StartConversationResponse>
  }
  turns: {
    submit(
      req: SubmitTurnRequest,
      idempotencyKey: string,
    ): Promise<SubmitTurnResponse>
    /** GET events_url as SSE. Calls `onEvent` for each frame until `done`, `error` or unsubscribe. */
    events(
      turnId: string,
      onEvent: (event: TurnEvent) => void,
      options?: StreamOptions,
    ): Unsubscribe
    confirm(turnId: string, req: ConfirmRequest): Promise<void>
    cancel(turnId: string): Promise<void>
    clientTimings(turnId: string, timings: ClientTimings): Promise<void>
  }
  answers: {
    rate(answerId: string, req: RatingRequest): Promise<void>
    /** POST /v1/answers/{id}/renditions {lang:"tw"}: "Hear in Twi". */
    renditionTw(answerId: string): Promise<RenditionResponse>
    renditionEvents(
      renditionId: string,
      onEvent: (event: RenditionEvent) => void,
    ): Unsubscribe
  }
}
