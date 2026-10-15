import { describe, expect, it } from "vitest"
import { operatorTurns } from "@/api/mock/teamFixtures"
import { toCsv } from "./csv"

describe("toCsv", () => {
  it("writes a header and one row per turn, quoting commas and quotes", () => {
    const turn = {
      ...operatorTurns[0],
      tag: {
        reason: "answer_wrong" as const,
        note: 'Said "two", guide says one',
        tagged_at: "2026-10-14T10:00:00Z",
      },
    }
    const [header, row] = toCsv([turn]).split("\n")
    expect(header.split(",")[0]).toBe("turn")
    expect(row.startsWith("T-0412,Fertiliser timing,twi_voice,field")).toBe(
      true,
    )
    expect(row).toContain('"Said ""two"", guide says one"')
  })
})
