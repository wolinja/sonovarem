import { expect, type Page } from "@playwright/test"

export type ModeName = "Speak Twi" | "Speak English" | "Read English"

/**
 * Opens the app against the mock API with fast timers and silent audio. Dev flags are read from
 * the first URL and kept for the tab (src/config/devFlags.ts).
 */
export async function openApp(
  page: Page,
  scenario = "happy",
  timescale = 0.05,
) {
  await page.goto(`/?scenario=${scenario}&timescale=${timescale}&audio=off`)
}

/** J1: S01 → S02 → S03 → (S04) → S05. */
export async function onboard(page: Page, mode: ModeName = "Speak Twi") {
  await page
    .getByRole("button", { name: "Start. Tap to turn on sound" })
    .click()
  await expect(page).toHaveURL(/\/mode$/)
  await page.getByRole("button", { name: new RegExp(`^${mode}`) }).click()

  await expect(page).toHaveURL(/\/consent$/)
  await page.getByRole("button", { name: "Yes, I am 18 or older" }).click()
  await page.getByRole("button", { name: "Yes, I agree" }).click()

  if (mode !== "Read English") {
    await expect(page).toHaveURL(/\/microphone$/)
    await page.getByRole("button", { name: "Continue" }).click()
  }
  await expect(page).toHaveURL(/\/ask$/)
}

/** Records a short question with the fake microphone. */
export async function askByVoice(page: Page) {
  await page.getByRole("button", { name: "Record your question" }).click()
  await expect(page.getByText("I am listening. Speak now.")).toBeVisible()
  await page.getByRole("button", { name: "Stop recording" }).click()
}
