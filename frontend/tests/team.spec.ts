/** J6 team views against the mock API (P1-04 S10, S11). */

import { expect, test } from "@playwright/test"

const open = (page: import("@playwright/test").Page, path: string) =>
  page.goto(`${path}?timescale=0.05&audio=off`)

test.describe("S10 rater scoring", () => {
  test("asks for the rater profile once, then scores by keyboard", async ({
    page,
  }) => {
    await open(page, "/team/rate")
    await expect(page.getByText("Item 12 of 40")).toBeVisible()
    await page.getByRole("button", { name: "Asante Twi" }).click()
    await page.getByRole("button", { name: "30–44" }).click()
    await page.getByRole("button", { name: "Start scoring" }).click()

    const rubric = page.getByRole("form", { name: "Rubric" })
    await expect(rubric).toBeVisible()
    const save = rubric.getByRole("button", { name: "Save and next" })
    await expect(save).toBeDisabled()
    // 1–5 scores the focused row, which moves on to the next unscored row.
    for (const key of ["5", "4", "3", "5"]) await page.keyboard.press(key)
    await expect(
      rubric.getByRole("button", { name: /^Relevance: 5/ }),
    ).toHaveAttribute("aria-pressed", "true")
    await expect(
      rubric.getByText("4: Correct, one minor omission."),
    ).toBeVisible()
    await expect(save).toBeEnabled()
    await page.keyboard.press("n")
    await expect(page.getByText("Item 13 of 40")).toBeVisible()

    // The profile is asked once: a reload goes straight to the rubric.
    await page.reload()
    await expect(page.getByText("Item 13 of 40")).toBeVisible()
    await expect(page.getByRole("form", { name: "Rubric" })).toBeVisible()
  })

  test("Skip item moves on without saving", async ({ page }) => {
    await open(page, "/team/rate")
    await page.getByRole("button", { name: "Fante" }).click()
    await page.getByRole("button", { name: "60+" }).click()
    await page.getByRole("button", { name: "Start scoring" }).click()
    await page.getByRole("button", { name: "Skip item" }).click()
    await expect(page.getByText("Item 13 of 40")).toBeVisible()
    await page.reload()
    await expect(page.getByText("Item 12 of 40")).toBeVisible()
  })
})

test.describe("S11 operator review", () => {
  test("filters turns, tags one and exports the tagged turns", async ({
    page,
  }) => {
    await open(page, "/team/review")
    const turns = page.getByRole("region", { name: "Turns" })
    const filters = page.getByRole("toolbar", { name: "Filters" })
    await expect(turns.getByRole("button")).toHaveCount(5)
    // Default: rated not helpful OR "I don't know".
    await filters.getByRole("button", { name: "“I don't know”" }).click()
    await expect(turns.getByRole("button")).toHaveCount(3)
    await filters.getByRole("button", { name: "Rated not helpful" }).click()
    await filters.getByRole("button", { name: "Low ASR confidence" }).click()
    await expect(turns.getByRole("button")).toHaveCount(1)
    await expect(filters.getByText("1 turn")).toBeVisible()

    await turns.getByRole("button", { name: /Leaf spots/ }).click()
    await expect(
      page.getByRole("heading", { name: "T-0401 · Leaf spots" }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Play question audio" }),
    ).toBeVisible()
    await page.getByLabel("Reason").selectOption("asr_misheard")
    await page.getByLabel("Note").fill("Heard 'leaf' as 'life'")
    await page.getByRole("button", { name: "Save tag" }).click()
    await expect(
      page.getByRole("status").getByText("Tagged: ASR misheard."),
    ).toBeVisible()
    await expect(
      turns.getByRole("button", { name: /Leaf spots/ }),
    ).toContainText("ASR misheard")

    // Another turn starts with an empty form, not the last note.
    await filters.getByRole("button", { name: "Rated not helpful" }).click()
    await turns.getByRole("button", { name: /Planting window/ }).click()
    await expect(page.getByLabel("Note")).toHaveValue("")

    const download = page.waitForEvent("download")
    await page.getByRole("button", { name: "Export tagged" }).click()
    expect((await download).suggestedFilename()).toMatch(
      /^sonovarem-tagged-turns-.*\.csv$/,
    )
  })

  test("audio is shown only where recordings consent allows it", async ({
    page,
  }) => {
    await open(page, "/team/review")
    await expect(
      page.getByRole("heading", { name: "T-0412 · Fertiliser timing" }),
    ).toBeVisible()
    await expect(
      page.getByText("Audio not kept: no recordings consent"),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: /question audio/ }),
    ).toHaveCount(0)
  })
})
