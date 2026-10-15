import { beforeEach, describe, expect, it } from "vitest"
import { ApiError } from "../contract"
import { createMockAdmin, resetMockTeam } from "./admin"
import { RATER_BATCH_SIZE, RATER_DONE_AT_START } from "./teamFixtures"

const instant = <T>(value: T) => Promise.resolve(value)
const online = () => {}

describe("mock admin", () => {
  beforeEach(() => resetMockTeam())

  it("serves the batch part-way and counts a scored item as done", async () => {
    const admin = createMockAdmin(instant, online)
    const batch = await admin.raterBatch()
    expect(batch.total).toBe(RATER_BATCH_SIZE)
    expect(batch.done).toBe(RATER_DONE_AT_START)
    await admin.scoreItem(batch.items[0].id, {
      relevance: 5,
      correctness: 4,
      groundedness: 3,
    })
    const next = await admin.raterBatch()
    expect(next.done).toBe(RATER_DONE_AT_START + 1)
    expect(next.items[0].id).toBe(batch.items[1].id)
  })

  it("rejects scores outside 1 to 5", async () => {
    const admin = createMockAdmin(instant, online)
    const { items } = await admin.raterBatch()
    await expect(
      admin.scoreItem(items[0].id, {
        relevance: 6,
        correctness: 4,
        groundedness: 3,
      }),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it("combines the outcome filters with OR, and narrows by mode", async () => {
    const admin = createMockAdmin(instant, online)
    const all = await admin.turns({})
    const idk = await admin.turns({ idk: true })
    const either = await admin.turns({ idk: true, low_rating: true })
    expect(idk.every((t) => t.idk)).toBe(true)
    expect(either.length).toBeGreaterThan(idk.length)
    expect(either.length).toBeLessThan(all.length)
    const twi = await admin.turns({
      idk: true,
      low_rating: true,
      mode: "twi_voice",
    })
    expect(twi.every((t) => t.mode === "twi_voice")).toBe(true)
  })

  it("keeps tags and exports only tagged turns", async () => {
    const admin = createMockAdmin(instant, online)
    expect(await admin.exportTagged()).toHaveLength(0)
    await admin.tagTurn("t-0412", { reason: "answer_wrong", note: "n" })
    const exported = await admin.exportTagged()
    expect(exported.map((t) => t.id)).toEqual(["t-0412"])
    const list = await admin.turns({})
    expect(list.find((t) => t.id === "t-0412")?.tag?.reason).toBe(
      "answer_wrong",
    )
  })
})
