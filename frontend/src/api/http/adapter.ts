/**
 * Placeholder for the real backend adapter. When the /v1 routes exist:
 * 1. `bun run generate-client` against the backend OpenAPI, and re-export its types from contract.ts.
 * 2. Implement each method with the generated SDK (cookies, `X-Requested-With: sonovarem`,
 *    `Idempotency-Key` on turns, confirm, rating and renditions).
 * 3. Implement `turns.events` with EventSource on `events_url`, parsing each frame into TurnEvent
 *    and resuming with `Last-Event-ID`.
 * The mock scenarios in ../mock/scenarios.ts are the expected event sequences.
 */

import { ApiError } from "../contract"
import type { SonovaremApi } from "../port"

const notImplemented = (): never => {
  throw new ApiError(
    "not_implemented",
    false,
    "The HTTP adapter is not implemented yet. Set VITE_API_MODE=mock.",
  )
}

export function createHttpApi(): SonovaremApi {
  const fail = async (): Promise<never> => notImplemented()
  return {
    sessions: { provisional: fail, warm: async () => {} },
    consent: { current: fail, record: fail, revoke: fail },
    auth: { requestOtp: fail, verifyOtp: fail, logout: fail },
    me: { get: fail, update: fail, remove: fail },
    memory: { list: fail, markWrong: fail, forget: fail, forgetAll: fail },
    conversations: { start: fail },
    turns: {
      submit: fail,
      events: () => notImplemented(),
      confirm: fail,
      cancel: fail,
      clientTimings: fail,
    },
    answers: {
      rate: fail,
      renditionTw: fail,
      renditionEvents: () => notImplemented(),
    },
  }
}
