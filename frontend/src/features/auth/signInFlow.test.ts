import { describe, expect, it } from "vitest"
import { formatLocal, normalizeGhanaPhone } from "./signInFlow"

describe("Ghana phone numbers", () => {
  it.each([
    ["024 123 4567", "+233241234567"],
    ["0241234567", "+233241234567"],
    ["241234567", "+233241234567"],
    ["+233 24 123 4567", "+233241234567"],
    ["233241234567", "+233241234567"],
  ])("normalises %s", (input, expected) => {
    expect(normalizeGhanaPhone(input)).toBe(expected)
  })

  it.each(["", "12345", "0141234567", "02412345678"])("rejects %s", (input) => {
    expect(normalizeGhanaPhone(input)).toBeNull()
  })

  it("formats for read-back", () => {
    expect(formatLocal("+233241234567")).toBe("024 123 4567")
  })
})
