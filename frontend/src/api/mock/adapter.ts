/**
 * In-memory implementation of SonovaremApi. It behaves like the backend contract in P1-05:
 * idempotent turn submission, a per-turn event stream with replay after `lastEventId`, echo-back
 * gating, first/second "no" handling, cancellation, OTP sign-in and memory. "Server" state
 * (accounts, memory) is kept in localStorage so reloads and "new device" sign-ins behave.
 */

import { CONSENT_VERSION } from "@/config/content"
import { devFlags, setDevFlag } from "@/config/devFlags"
import { scaled } from "@/config/timing"
import {
  ApiError,
  type ConsentLayer,
  type Me,
  type MemoryItem,
  type Mode,
  type SubmitTurnRequest,
  type User,
} from "../contract"
import type { RenditionEvent, TurnEvent, TurnEventName } from "../events"
import type { SonovaremApi, Unsubscribe } from "../port"
import { createMockAdmin, resetMockTeam } from "./admin"
import { type Clock, realClock } from "./clock"
import {
  answers,
  consentText,
  defaultAnswer,
  fallbackItems,
  MOCK_OTP_CODE,
  returningUserMemory,
} from "./fixtures"
import {
  type EventStep,
  getScenario,
  renditionScript,
  type ScriptStep,
  scenarios,
} from "./scenarios"

const DB_KEY = "sv-mock-db"

interface MockUser {
  id: string
  phone: string
  mode: Mode
  consent: Partial<Record<ConsentLayer, boolean>>
  memory: MemoryItem[]
}

interface MockDb {
  users: Record<string, MockUser>
  sessionUserId?: string
}

function loadDb(): MockDb {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw) as MockDb
  } catch {
    // unreadable storage: start empty
  }
  return { users: {} }
}

interface TurnRun {
  id: string
  conversationId: string
  steps: ScriptStep[]
  cursor: number
  events: TurnEvent[]
  listeners: Set<(e: TurnEvent) => void>
  timer?: ReturnType<Clock["setTimeout"]>
  finished: boolean
}

interface OtpRequest {
  phone: string
  attempts: number
  expiresAt: number
}

const TERMINAL: TurnEventName[] = ["done", "error", "cancelled"]

let idCounter = 0
const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`

export interface MockControls {
  scenarios: typeof scenarios
  /** The code the mock accepts (no SMS is sent). */
  otpCode: string
  getScenarioId(): string
  setScenario(id: string): void
  isOffline(): boolean
  setOffline(offline: boolean): void
  resetServer(): void
  subscribe(listener: () => void): Unsubscribe
}

export function createMockApi(clock: Clock = realClock): {
  api: SonovaremApi
  controls: MockControls
} {
  let db = loadDb()
  let offline = false
  let offlineTriggeredFor: string | undefined
  const turns = new Map<string, TurnRun>()
  const idempotency = new Map<string, { turn_id: string; events_url: string }>()
  const noCounts = new Map<string, number>()
  const otpRequests = new Map<string, OtpRequest>()
  const controlListeners = new Set<() => void>()

  const save = () => {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db))
    } catch {
      // ignore
    }
  }
  const notify = () => {
    for (const l of controlListeners) l()
  }
  const latency = <T>(value: T, ms = 150): Promise<T> =>
    new Promise((resolve) => clock.setTimeout(() => resolve(value), scaled(ms)))
  const ensureOnline = () => {
    const browserOffline =
      typeof navigator !== "undefined" && navigator.onLine === false
    if (offline || browserOffline) {
      throw new ApiError("offline", true, "Mock network is offline")
    }
  }
  const currentUser = (): MockUser | undefined =>
    db.sessionUserId
      ? Object.values(db.users).find((u) => u.id === db.sessionUserId)
      : undefined
  const toUser = (u: MockUser): User => ({
    id: u.id,
    mode: u.mode,
    role: "farmer",
    phone_last4: u.phone.slice(-4),
  })
  const toMe = (u: MockUser): Me => ({
    user: toUser(u),
    consent: u.consent,
    farm: { crops: ["maize"] },
  })

  // ---- turn streaming -------------------------------------------------------

  const emit = (run: TurnRun, step: Pick<EventStep, "event" | "data">) => {
    if (run.finished) return
    const event = {
      id: run.events.length + 1,
      event: step.event,
      data: { ...step.data, turn_id: run.id, ts: Date.now() },
    } as TurnEvent
    run.events.push(event)
    if (TERMINAL.includes(event.event)) run.finished = true
    for (const listener of run.listeners) listener(event)
  }

  const advance = (run: TurnRun) => {
    if (run.finished || run.timer !== undefined) return
    const step = run.steps[run.cursor]
    if (!step || "gate" in step) return
    run.timer = clock.setTimeout(() => {
      run.timer = undefined
      run.cursor++
      emit(run, step)
      advance(run)
    }, scaled(step.after))
  }

  const stop = (run: TurnRun) => {
    if (run.timer !== undefined) clock.clearTimeout(run.timer)
    run.timer = undefined
  }

  const releasedSeq = (run: TurnRun) =>
    run.events.reduce(
      (max, e) => (e.event === "answer_text" ? Math.max(max, e.data.seq) : max),
      0,
    )

  const api: SonovaremApi = {
    sessions: {
      async provisional(req) {
        ensureOnline()
        return latency({
          user: { id: newId("prov"), cohort: "unknown" as const },
          limits: { turns_left: req.invite_token ? 50 : 10 },
        })
      },
      async warm() {
        // fire-and-forget; never throws
      },
    },

    consent: {
      async current() {
        return latency(consentText(CONSENT_VERSION), 50)
      },
      async record(req) {
        ensureOnline()
        const user = currentUser()
        if (user) {
          user.consent = { ...user.consent, ...req.layers }
          save()
        }
        return latency({ consent_id: newId("consent") })
      },
      async revoke(layer) {
        const user = currentUser()
        if (user) {
          user.consent[layer] = false
          if (layer === "memory") user.memory = []
          save()
        }
        return latency(undefined)
      },
    },

    auth: {
      async requestOtp(req) {
        ensureOnline()
        const request_id = newId("otp")
        otpRequests.set(request_id, {
          phone: req.phone,
          attempts: 0,
          expiresAt: Date.now() + 10 * 60_000,
        })
        return latency({ request_id, resend_after_s: 30, webotp: true }, 400)
      },
      async verifyOtp(req) {
        ensureOnline()
        const pending = otpRequests.get(req.request_id)
        if (!pending) throw new ApiError("otp_expired", false)
        if (Date.now() > pending.expiresAt) {
          throw new ApiError("otp_expired", false)
        }
        if (pending.attempts >= 5) throw new ApiError("otp_locked", false)
        if (req.code !== MOCK_OTP_CODE) {
          pending.attempts++
          await latency(undefined, 300)
          throw new ApiError(
            pending.attempts >= 5 ? "otp_locked" : "otp_wrong",
            false,
          )
        }
        otpRequests.delete(req.request_id)
        let user = db.users[pending.phone]
        const isNew = !user
        if (!user) {
          user = {
            id: newId("user"),
            phone: pending.phone,
            mode: "twi_voice",
            consent: { service: true },
            memory: pending.phone.endsWith("0000")
              ? [...returningUserMemory]
              : [],
          }
          if (user.memory.length) user.consent.memory = true
          db.users[pending.phone] = user
        }
        db.sessionUserId = user.id
        save()
        return latency({
          user: toUser(user),
          merged_provisional: true,
          needs: {
            age: false,
            consent:
              isNew || user.consent.memory === undefined
                ? (["memory"] as ConsentLayer[])
                : [],
          },
        })
      },
      async logout() {
        db.sessionUserId = undefined
        save()
        return latency(undefined)
      },
    },

    me: {
      async get() {
        const user = currentUser()
        if (!user) throw new ApiError("not_found", false)
        return latency(toMe(user), 80)
      },
      async update(patch) {
        const user = currentUser()
        if (!user) throw new ApiError("not_found", false)
        if (patch.mode) user.mode = patch.mode
        save()
        return latency(toMe(user), 80)
      },
      async remove() {
        ensureOnline()
        const user = currentUser()
        if (user) delete db.users[user.phone]
        db.sessionUserId = undefined
        save()
        return latency({ deletion_request_id: newId("del") }, 400)
      },
    },

    memory: {
      async list() {
        const user = currentUser()
        if (!user?.consent.memory) return latency([], 80)
        return latency([...user.memory], 150)
      },
      async markWrong(id) {
        const user = currentUser()
        if (user) {
          user.memory = user.memory.filter((m) => m.id !== id)
          save()
        }
        return latency(undefined)
      },
      async forget(id) {
        const user = currentUser()
        if (user) {
          user.memory = user.memory.filter((m) => m.id !== id)
          save()
        }
        return latency(undefined)
      },
      async forgetAll() {
        const user = currentUser()
        if (user) {
          user.memory = []
          save()
        }
        return latency(undefined)
      },
    },

    conversations: {
      async start() {
        return latency({ conversation_id: newId("conv") }, 50)
      },
    },

    turns: {
      async submit(req: SubmitTurnRequest, idempotencyKey: string) {
        const scenario = getScenario(devFlags.scenario)
        if (scenario.offlineForMs && offlineTriggeredFor !== scenario.id) {
          offlineTriggeredFor = scenario.id
          offline = true
          notify()
          clock.setTimeout(() => {
            offline = false
            notify()
          }, scaled(scenario.offlineForMs))
        }
        ensureOnline()
        const existing = idempotency.get(idempotencyKey)
        if (existing) return latency(existing)
        if (scenario.submitError === "rate_limited") {
          await latency(undefined, 300)
          throw new ApiError("rate_limited", false, undefined, 120)
        }
        const id = newId("turn")
        const run: TurnRun = {
          id,
          conversationId: req.conversation_id,
          steps: scenario.script({
            mode: req.mode,
            kind: req.kind,
            text: req.text,
            menuItemId: req.menu_item_id,
          }),
          cursor: 0,
          events: [],
          listeners: new Set(),
          finished: false,
        }
        turns.set(id, run)
        const response = { turn_id: id, events_url: `/v1/turns/${id}/events` }
        idempotency.set(idempotencyKey, response)
        advance(run)
        return latency(response, 250)
      },

      events(turnId, onEvent, options) {
        const run = turns.get(turnId)
        if (!run) return () => {}
        const after = options?.lastEventId ?? 0
        let active = true
        queueMicrotask(() => {
          if (!active) return
          for (const e of run.events) if (e.id > after) onEvent(e)
          run.listeners.add(onEvent)
        })
        return () => {
          active = false
          run.listeners.delete(onEvent)
        }
      },

      async confirm(turnId, req) {
        const run = turns.get(turnId)
        if (!run || run.finished) return
        const gate = run.steps[run.cursor]
        if (req.decision === "yes") {
          noCounts.set(run.conversationId, 0)
          if (gate && "gate" in gate) run.cursor++
          advance(run)
          return
        }
        stop(run)
        const count = (noCounts.get(run.conversationId) ?? 0) + 1
        if (count >= 2) {
          noCounts.set(run.conversationId, 0)
          emit(run, {
            event: "fallback",
            data: { kind: "menu", items: fallbackItems },
          })
        } else {
          noCounts.set(run.conversationId, count)
          emit(run, { event: "reprompt", data: { prompt_key: "PR-ECH-03" } })
        }
        emit(run, {
          event: "cancelled",
          data: { reason: "user_no", released_seq: releasedSeq(run) },
        })
      },

      async cancel(turnId) {
        const run = turns.get(turnId)
        if (!run || run.finished) return
        stop(run)
        emit(run, {
          event: "cancelled",
          data: { reason: "user_cancel", released_seq: releasedSeq(run) },
        })
      },

      async clientTimings() {
        // The real backend stores these for D5; the mock only needs to accept them.
      },
    },

    answers: {
      async rate() {
        return latency(undefined)
      },
      async renditionTw(answerId) {
        ensureOnline()
        const fixture =
          answers.find((a) => answerId.startsWith(`ans-${a.id}-`)) ??
          defaultAnswer
        const run: TurnRun = {
          id: newId("rend"),
          conversationId: "rendition",
          steps: renditionScript(fixture),
          cursor: 0,
          events: [],
          listeners: new Set(),
          finished: false,
        }
        turns.set(run.id, run)
        advance(run)
        return latency({
          rendition_id: run.id,
          events_url: `/v1/renditions/${run.id}/events`,
        })
      },
      renditionEvents(renditionId, onEvent) {
        return api.turns.events(renditionId, (e) =>
          onEvent(e as RenditionEvent),
        )
      },
    },

    admin: createMockAdmin(latency, ensureOnline),
  }

  const controls: MockControls = {
    scenarios,
    otpCode: MOCK_OTP_CODE,
    getScenarioId: () => getScenario(devFlags.scenario).id,
    setScenario(id) {
      setDevFlag("scenario", id)
      offlineTriggeredFor = undefined
      notify()
    },
    isOffline: () => offline,
    setOffline(value) {
      offline = value
      notify()
    },
    resetServer() {
      db = { users: {} }
      save()
      resetMockTeam()
      notify()
    },
    subscribe(listener) {
      controlListeners.add(listener)
      return () => controlListeners.delete(listener)
    },
  }

  return { api, controls }
}
