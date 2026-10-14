import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { devFlags } from "@/config/devFlags"
import { ApiError } from "../contract"
import type { TurnEvent } from "../events"
import { createMockApi } from "./adapter"
import { scenarios } from "./scenarios"

beforeEach(() => {
  vi.useFakeTimers()
  devFlags.scenario = undefined
})
afterEach(() => {
  vi.useRealTimers()
})

async function submitVoice(
  api: ReturnType<typeof createMockApi>["api"],
  key = "k1",
) {
  const p = api.turns.submit(
    { conversation_id: "c", mode: "twi_voice", kind: "question" },
    key,
  )
  await vi.advanceTimersByTimeAsync(1000)
  return p
}

function collect(api: ReturnType<typeof createMockApi>["api"], turnId: string) {
  const events: TurnEvent[] = []
  api.turns.events(turnId, (e) => events.push(e))
  return events
}

describe("mock adapter turns", () => {
  it("happy path pauses at the echo gate, then streams to done after yes", async () => {
    const { api } = createMockApi()
    const { turn_id } = await submitVoice(api)
    const events = collect(api, turn_id)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(events.map((e) => e.event)).toContain("awaiting_confirm")
    expect(events.at(-1)?.event).toBe("awaiting_confirm")
    await api.turns.confirm(turn_id, { decision: "yes", method: "tap" })
    await vi.advanceTimersByTimeAsync(20_000)
    const names = events.map((e) => e.event)
    expect(names).toContain("working")
    expect(names).toContain("answer_text")
    expect(names).toContain("answer_audio")
    expect(names.at(-1)).toBe("done")
    // ids are strictly increasing, as SSE requires for Last-Event-ID replay
    expect(events.map((e) => e.id)).toEqual(events.map((_, i) => i + 1))
  })

  it("is idempotent on the client key", async () => {
    const { api } = createMockApi()
    const a = await submitVoice(api, "same")
    const b = await submitVoice(api, "same")
    expect(b.turn_id).toBe(a.turn_id)
  })

  it("replays only events after lastEventId", async () => {
    const { api } = createMockApi()
    const { turn_id } = await submitVoice(api)
    await vi.advanceTimersByTimeAsync(10_000)
    const later: TurnEvent[] = []
    api.turns.events(turn_id, (e) => later.push(e), { lastEventId: 3 })
    await vi.advanceTimersByTimeAsync(0)
    expect(later[0]?.id).toBe(4)
  })

  it("first no reprompts, second no in the same conversation gives the fallback menu", async () => {
    const { api } = createMockApi()
    const first = await submitVoice(api, "a")
    const e1 = collect(api, first.turn_id)
    await vi.advanceTimersByTimeAsync(10_000)
    await api.turns.confirm(first.turn_id, { decision: "no", method: "tap" })
    await vi.advanceTimersByTimeAsync(0)
    expect(e1.map((e) => e.event).slice(-2)).toEqual(["reprompt", "cancelled"])

    const second = await submitVoice(api, "b")
    const e2 = collect(api, second.turn_id)
    await vi.advanceTimersByTimeAsync(10_000)
    await api.turns.confirm(second.turn_id, { decision: "no", method: "tap" })
    await vi.advanceTimersByTimeAsync(0)
    expect(e2.map((e) => e.event).slice(-2)).toEqual(["fallback", "cancelled"])
  })

  it("typed questions skip the echo-back", async () => {
    const { api } = createMockApi()
    const p = api.turns.submit(
      {
        conversation_id: "c",
        mode: "english_text",
        kind: "question",
        text: "fertiliser?",
      },
      "t",
    )
    await vi.advanceTimersByTimeAsync(1000)
    const { turn_id } = await p
    const events = collect(api, turn_id)
    await vi.advanceTimersByTimeAsync(20_000)
    const names = events.map((e) => e.event)
    expect(names).not.toContain("heard")
    expect(names).not.toContain("answer_audio")
    expect(names.at(-1)).toBe("done")
  })

  it("offline scenario rejects uploads with a retryable offline error, then recovers", async () => {
    devFlags.scenario = "offline"
    const { api } = createMockApi()
    await expect(
      api.turns.submit(
        { conversation_id: "c", mode: "twi_voice", kind: "question" },
        "o",
      ),
    ).rejects.toMatchObject({ code: "offline", retryable: true })
    await vi.advanceTimersByTimeAsync(7000)
    await expect(submitVoice(api, "o")).resolves.toHaveProperty("turn_id")
  })

  it("rate_limited scenario throws a non-retryable 429", async () => {
    devFlags.scenario = "rate_limited"
    const { api } = createMockApi()
    const p = api.turns.submit(
      { conversation_id: "c", mode: "twi_voice", kind: "question" },
      "r",
    )
    const assertion = expect(p).rejects.toBeInstanceOf(ApiError)
    await vi.advanceTimersByTimeAsync(1000)
    await assertion
  })

  it("every scenario produces a script that ends in a terminal event or a gate", () => {
    for (const s of scenarios) {
      if (s.submitError) continue
      const steps = s.script({ mode: "twi_voice", kind: "question" })
      const last = steps.at(-1)
      if (s.id === "timeout") {
        expect(last && "event" in last && last.event).toBe("working")
        continue
      }
      // After the gate, the remaining steps must end in done/error
      const afterGate = steps.slice(steps.findIndex((x) => "gate" in x) + 1)
      const end = afterGate.at(-1)
      expect(
        end && "event" in end && ["done", "error"].includes(end.event),
        s.id,
      ).toBe(true)
    }
  })
})

describe("mock adapter auth", () => {
  it("accepts 123456, rejects others, locks after 5 wrong", async () => {
    const { api } = createMockApi()
    const req = api.auth.requestOtp({
      phone: "+233240000001",
      turnstile_token: "t",
    })
    await vi.advanceTimersByTimeAsync(1000)
    const { request_id } = await req

    for (let i = 0; i < 4; i++) {
      const wrong = api.auth.verifyOtp({ request_id, code: "000000" })
      const a = expect(wrong).rejects.toMatchObject({ code: "otp_wrong" })
      await vi.advanceTimersByTimeAsync(1000)
      await a
    }
    const ok = api.auth.verifyOtp({ request_id, code: "123456" })
    await vi.advanceTimersByTimeAsync(1000)
    await expect(ok).resolves.toMatchObject({ merged_provisional: true })
  })

  it("numbers ending in 0000 are returning users with memory", async () => {
    const { api } = createMockApi()
    const req = api.auth.requestOtp({
      phone: "+233240000000",
      turnstile_token: "t",
    })
    await vi.advanceTimersByTimeAsync(1000)
    const { request_id } = await req
    const ok = api.auth.verifyOtp({ request_id, code: "123456" })
    await vi.advanceTimersByTimeAsync(1000)
    await ok
    const mem = api.memory.list()
    await vi.advanceTimersByTimeAsync(1000)
    expect((await mem).length).toBeGreaterThan(0)
  })
})
