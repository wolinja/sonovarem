/**
 * End-to-end farmer journeys against the mock API (P0-03 J1, J2, J5; P1-04 §3.3 recovery paths).
 * Each test picks its mock scenario through the URL; see src/api/mock/scenarios.ts.
 */

import { expect, test } from "@playwright/test"
import { askByVoice, onboard, openApp } from "./helpers"

test.describe("J1 onboarding", () => {
  test("Twi voice: start, mode, age, consent, microphone, conversation", async ({
    page,
  }) => {
    await openApp(page)
    await expect(
      page.getByRole("heading", { name: "Tap to start" }),
    ).toBeVisible()
    await onboard(page, "Speak Twi")
    await expect(
      page.getByRole("heading", { name: "What can I ask?" }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", {
        name: "Change language and mode, current: Speak Twi",
      }),
    ).toBeVisible()
  })

  test("English text never asks for the microphone", async ({ page }) => {
    await openApp(page)
    await onboard(page, "Read English")
    await expect(page.getByLabel("Your question")).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Record your question" }),
    ).toHaveCount(0)
  })

  test("under 18 exits politely and stores nothing", async ({ page }) => {
    await openApp(page)
    await page
      .getByRole("button", { name: "Start. Tap to turn on sound" })
      .click()
    await page.getByRole("button", { name: /^Speak Twi/ }).click()
    await page.getByRole("button", { name: "No, I am under 18" }).click()
    await expect(page).toHaveURL(/\/under-18$/)
    await expect(
      page.getByRole("heading", { name: "This service is for adults only" }),
    ).toBeVisible()
    await expect(
      page.getByText("Nothing you said or tapped was saved."),
    ).toBeVisible()
    const stored = await page.evaluate(() => localStorage.getItem("sv-session"))
    expect(stored).toBeNull()
  })

  test("the conversation is guarded until consent is given", async ({
    page,
  }) => {
    await openApp(page)
    await page.goto("/ask")
    await expect(page).toHaveURL(/\/mode$/)
  })

  test("blocked microphone offers recovery and typing instead", async ({
    page,
  }) => {
    await openApp(page)
    await page
      .getByRole("button", { name: "Start. Tap to turn on sound" })
      .click()
    await page.getByRole("button", { name: /^Speak English/ }).click()
    await page.getByRole("button", { name: "Yes, I am 18 or older" }).click()
    await page.getByRole("button", { name: "Yes, I agree" }).click()
    await page.getByRole("button", { name: "I tapped Block" }).click()
    await expect(
      page.getByRole("heading", { name: "The microphone is blocked" }),
    ).toBeVisible()
    await page.getByRole("button", { name: "Type instead" }).click()
    await expect(page).toHaveURL(/\/ask$/)
    await expect(page.getByLabel("Your question")).toBeVisible()
  })
})

test.describe("J2 ask loop (voice)", () => {
  test("record → echo-back → implicit yes → answer with source → rating → save me", async ({
    page,
  }) => {
    await openApp(page)
    await onboard(page)
    await askByVoice(page)

    await expect(page.getByText("You asked:")).toBeVisible()
    // High-confidence echo: the implicit yes continues without a tap.
    await expect(
      page.getByRole("heading", { name: "[Key action, in Twi]" }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", {
        name: /From: Ministry of Food and Agriculture/,
      }),
    ).toBeVisible()

    await expect(
      page.getByRole("radiogroup", { name: "Did this advice help you?" }),
    ).toBeVisible()
    await page.getByRole("radio", { name: "It helped" }).click()
    await page.getByRole("button", { name: "Done" }).click()

    await expect(
      page.getByRole("heading", { name: "Save me so I remember you" }),
    ).toBeVisible()
  })

  test("explicit confirmation: tap Yes", async ({ page }) => {
    await openApp(page, "explicit")
    await onboard(page)
    await askByVoice(page)
    await expect(
      page.locator("mark", { hasText: "maize" }).first(),
    ).toBeAttached()
    await page.getByRole("button", { name: "Yes, that is right" }).click()
    await expect(
      page.getByRole("heading", { name: "[Key action, in Twi]" }),
    ).toBeVisible()
  })

  test("No twice reaches the fallback menu, and a menu choice is answered", async ({
    page,
  }) => {
    await openApp(page, "explicit")
    await onboard(page)
    await askByVoice(page)
    await page.getByRole("button", { name: "No, that is wrong" }).click()

    // After the 1st no the app re-prompts and listens again by itself.
    await expect(page.getByText("I am listening. Speak now.")).toBeVisible()
    await page.getByRole("button", { name: "Stop recording" }).click()
    await page.getByRole("button", { name: "No, that is wrong" }).click()

    await expect(
      page.getByRole("heading", { name: /I could not catch that/ }),
    ).toBeVisible()
    const choice = page.getByRole("button", {
      name: /Which fertiliser, and when\?/,
    })
    await choice.click() // first tap plays the label
    await choice.click() // second tap asks
    await expect(
      page.locator("blockquote", { hasText: "Verbatim dose quote" }).first(),
    ).toBeVisible()
  })

  test("clarifying question with quick replies", async ({ page }) => {
    await openApp(page, "clarify")
    await onboard(page)
    await askByVoice(page)
    await expect(
      page.getByRole("heading", { name: "[Clarifying question, in Twi]" }),
    ).toBeVisible()
    await expect(page.getByText("How big is your maize now?")).toBeVisible()
    const reply = page.getByRole("button", { name: /Knee high/ })
    await reply.click() // first tap plays it
    await expect(reply).toContainText("Tap again to send")
    await reply.click()
    await expect(
      page.getByRole("heading", { name: "[Key action, in Twi]" }),
    ).toBeVisible()
  })

  test("I don't know is honest and gives next steps", async ({ page }) => {
    await openApp(page, "idk")
    await onboard(page)
    await askByVoice(page)
    await expect(
      page.getByRole("heading", {
        name: "I don't have reliable information on this.",
      }),
    ).toBeVisible()
    await expect(
      page.getByText("Ask an extension officer if one is near"),
    ).toBeVisible()
  })
})

test.describe("J5 English text", () => {
  test("typed question → streamed answer → Hear in Twi", async ({ page }) => {
    await openApp(page)
    await onboard(page, "Read English")
    await page.getByLabel("Your question").fill("When should I plant maize?")
    await page.getByRole("button", { name: "Send" }).click()
    await expect(
      page.getByRole("heading", {
        name: "Plant once the rains are steady, not at the very first rain.",
      }),
    ).toBeVisible()
    await page.getByRole("button", { name: "Hear in Twi" }).click()
    await expect(page.getByText("In Twi", { exact: true })).toBeVisible()
  })
})

test.describe("recovery paths", () => {
  test("offline: the question is kept and sent when the network returns", async ({
    page,
  }) => {
    await openApp(page, "offline", 0.5)
    await onboard(page)
    await askByVoice(page)
    await expect(
      page.getByRole("heading", { name: "No connection" }),
    ).toBeVisible()
    await expect(
      page.getByText("Saved on this device, waiting to send"),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Recording paused, no connection" }),
    ).toBeVisible()
    await expect(page.getByText("You asked:")).toBeVisible({ timeout: 15_000 })
  })

  test("offline: Try now sends without waiting for the countdown", async ({
    page,
  }) => {
    const setNetwork = async (offline: boolean) => {
      await page.getByRole("button", { name: "Mock scenarios" }).click()
      await page.getByLabel("Network offline").setChecked(offline)
      await page.getByRole("button", { name: "Mock scenarios" }).click()
    }
    await openApp(page, "happy", 1)
    await onboard(page, "Read English")
    await setNetwork(true)
    await page.getByLabel("Your question").fill("When should I plant maize?")
    await page.getByRole("button", { name: "Send" }).click()
    // After the first failed retry the wait is 4 s or more.
    await expect(page.getByText(/Trying again in [3-9] seconds/)).toBeVisible({
      timeout: 10_000,
    })
    await setNetwork(false)
    await page.getByRole("button", { name: "Try now" }).click()
    await expect(
      page.getByRole("heading", { name: "No connection" }),
    ).toHaveCount(0, { timeout: 2_000 })
  })

  test("nothing heard: record again", async ({ page }) => {
    await openApp(page, "nothing_heard")
    await onboard(page)
    await askByVoice(page)
    await expect(page.getByText("I did not hear anything.")).toBeVisible()
    await page.getByRole("button", { name: "Record again" }).click()
    await expect(page.getByText("I am listening. Speak now.")).toBeVisible()
  })

  test("timeout ends the turn and offers a retry", async ({ page }) => {
    await openApp(page, "timeout")
    await onboard(page)
    await askByVoice(page)
    await expect(page.getByText("This is taking too long.")).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible()
  })

  test("rate limited explains and does not retry", async ({ page }) => {
    await openApp(page, "rate_limited")
    await onboard(page, "Read English")
    await page.getByLabel("Your question").fill("When should I plant maize?")
    await page.getByRole("button", { name: "Send" }).click()
    await expect(page.getByText("Too many questions right now.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0)
  })
})

test.describe("identity and settings", () => {
  test("returning user signs in on a new phone and hears the memory recap", async ({
    page,
  }) => {
    await openApp(page)
    await page.getByRole("link", { name: "I've used this before" }).click()
    await page.getByLabel("Your phone number").fill("024 000 0000")
    // Recordings consent cannot be given until IRB approval.
    const recordings = page.getByRole("group", { name: /voice recordings/ })
    await expect(recordings.getByRole("button", { name: "Yes" })).toBeDisabled()
    await page
      .getByRole("group", { name: /May I remember our talks/ })
      .getByRole("button", { name: "Yes" })
      .click()
    await page.getByRole("button", { name: "Send me a code" }).click()

    await expect(page).toHaveURL(/\/sign-in\/code$/)
    await expect(
      page.getByText("Sent by SMS to the number ending"),
    ).toBeVisible()
    await page.getByLabel("6-number code").fill("000000")
    await expect(
      page.getByRole("main").getByText("That code is not right."),
    ).toBeVisible()
    await page.getByLabel("6-number code").fill("123456")

    await expect(page).toHaveURL(/\/(ask|microphone)$/)
    if (page.url().endsWith("/microphone")) {
      await page.getByRole("button", { name: "Continue" }).click()
    }
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible()
    await expect(page.getByText("Insects on your maize leaves")).toBeVisible()
    await page
      .getByRole("button", { name: "Forget this: Your maize farm near [TOWN]" })
      .click()
    await expect(
      page.getByRole("status").getByText(/I have forgotten your maize farm/),
    ).toBeVisible()
  })

  test("delete account is two-step and clears the device", async ({ page }) => {
    await openApp(page)
    await onboard(page, "Read English")
    await page.getByRole("link", { name: "Settings" }).click()
    await page.getByRole("link", { name: /Delete my account/ }).click()
    await expect(
      page.getByRole("heading", { name: "Delete your account?" }),
    ).toBeVisible()
    await page.getByRole("button", { name: "Yes, delete everything" }).click()
    await expect(
      page.getByRole("heading", { name: "Are you sure?" }),
    ).toBeVisible()
    await page.getByRole("button", { name: "Delete for good" }).click()
    await expect(page.getByText("Your account is deleted.")).toBeVisible()
    const stored = await page.evaluate(() => localStorage.getItem("sv-session"))
    expect(stored).toBeNull()
  })

  test("switching mode keeps the conversation", async ({ page }) => {
    await openApp(page)
    await onboard(page, "Read English")
    await page.getByLabel("Your question").fill("When should I plant maize?")
    await page.getByRole("button", { name: "Send" }).click()
    // Text mode rates inside the answer card (mockups/J3).
    await page.getByRole("radio", { name: "It helped" }).click()
    await page.getByRole("button", { name: "Done" }).click()
    await page.getByRole("button", { name: /Change language and mode/ }).click()
    await expect(
      page.getByRole("dialog", { name: "Which way do you want to talk now?" }),
    ).toBeVisible()
    await page.getByRole("button", { name: /^Speak English/ }).click()
    await expect(page).toHaveURL(/\/microphone$/)
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(
      page.getByText("When should I plant maize?").first(),
    ).toBeVisible()
  })

  test("settings: listening switches are saved", async ({ page }) => {
    await openApp(page)
    await onboard(page, "Read English")
    await page.getByRole("link", { name: "Settings" }).click()
    const confirmSwitch = page.getByRole("switch", {
      name: "Always ask me to confirm my question",
    })
    await expect(confirmSwitch).toHaveAttribute("aria-checked", "false")
    await confirmSwitch.click()
    await expect(confirmSwitch).toHaveAttribute("aria-checked", "true")
    const prefs = await page.evaluate(
      () => JSON.parse(localStorage.getItem("sv-session") ?? "{}").prefs,
    )
    expect(prefs.alwaysConfirm).toBe(true)
    await expect(
      page.getByRole("switch", { name: "Keep my voice recordings" }),
    ).toBeDisabled()
  })
})

test.describe("J4 language mismatch", () => {
  test("offers to switch and never switches by itself", async ({ page }) => {
    await openApp(page, "lang_mismatch")
    await onboard(page)
    await askByVoice(page)
    await expect(
      page.getByRole("heading", {
        name: "It sounds like you spoke English. Do you want to switch?",
      }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", {
        name: "Change language and mode, current: Speak Twi",
      }),
    ).toBeVisible()
    await page.getByRole("button", { name: /^Switch to English/ }).click()
    await expect(
      page.getByRole("heading", {
        name: "Plant once the rains are steady, not at the very first rain.",
      }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", {
        name: "Change language and mode, current: Speak English",
      }),
    ).toBeVisible()
  })
})
