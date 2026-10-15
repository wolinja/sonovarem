/**
 * Fixed-prompt registry (P1-04 §4.3). Each prompt has an English text (shown on screen and used by
 * the dev speech stand-in) and, once recorded (T-053/T-054), audio per voice language. A build
 * that still uses stand-ins for fixed prompts is not field-ready (P1-04 §11.4): see
 * `missingRecordings()`.
 */

import type { Lang } from "@/api/contract"
import { consentSlots, cropScope } from "@/config/content"

export interface Prompt {
  en: string
  /** Recorded clip URLs, filled in when the native-speaker recordings land. */
  audio: Partial<Record<Lang, string>>
}

const p = (en: string): Prompt => ({ en, audio: {} })

export const prompts = {
  "PR-ONB-01": p(
    "Welcome to Sonovarem. Ask about your farm and hear the answer.",
  ),
  "PR-ONB-02": p(
    "Choose how you want to talk. Each option says its own name when you tap it.",
  ),
  "PR-MOD-01a": p("Speak Twi"),
  "PR-MOD-01b": p("Speak English"),
  "PR-MOD-01c": p("Read English"),
  "PR-MOD-02": p("Done. We will talk this way now."),
  "PR-MOD-03": p("Which way do you want to talk now?"),
  "PR-MOD-04": p(
    "It sounds like you spoke another language. Do you want to switch?",
  ),
  "PR-AGE-01": p("Are you 18 years or older?"),
  "PR-AGE-02": p(
    "Thank you. This service is for adults only. Nothing was saved.",
  ),
  "PR-CON-01": p(
    `Before you ask: we record your question so we can answer it. It is sent to ${consentSlots.providers} in ${consentSlots.countries}. Your recording is not kept unless you say yes later. You can delete everything from Settings.`,
  ),
  "PR-CON-02": p("Do you agree? Tap the tick, or say yes."),
  "PR-CON-03": p(
    "May I remember our talks and your farm, so I can help you next time?",
  ),
  "PR-CON-04": p(
    "May we keep your voice recordings to improve Sonovarem? You can say no.",
  ),
  "PR-DIS-01": p(
    "Answers are general guidance from named farming guides, not a professional recommendation. Check with an extension officer or agro-dealer before you act.",
  ),
  "PR-MIC-01": p(
    "I need your microphone to hear you. A box will appear. Tap the button shown in the picture.",
  ),
  "PR-MIC-02": p("Thank you. Now I can hear you."),
  "PR-MIC-03": p(
    "The microphone is blocked. Follow the pictures, or type instead, or ask someone to help.",
  ),
  "PR-ASK-01": p("Tap the big button and ask your question."),
  "PR-ASK-02": p(
    `I can help with ${cropScope.label.toLowerCase()}. Tap a question to hear it.`,
  ),
  "PR-ECH-02": p("Is that right? Tap the tick or the cross."),
  "PR-ECH-03": p("Sorry. Please ask again."),
  "PR-ECH-04": p("I could not catch that. Here are some common questions."),
  "PR-CLA-01": p("To help you, I need to know one thing."),
  "PR-WRK-01": p("Checking the guide."),
  "PR-WRK-02": p("Checking your field sensor."),
  "PR-WRK-03": p("Checking the weather."),
  "PR-WRK-04": p("Preparing your answer."),
  "PR-WRK-05": p("Still working. Thank you for waiting."),
  "PR-WRK-06": p("This is slow. Keep waiting, or try again?"),
  "PR-ANS-02": p("Do you want to hear more?"),
  "PR-ANS-03": p(
    "Confirm with an agro-dealer or extension officer. Follow the label, and wear protection.",
  ),
  "PR-IDK-01": p(
    `I don't have reliable information on this. I can help with ${cropScope.label.toLowerCase()}.`,
  ),
  "PR-IDK-02": p(
    "You could ask an experienced neighbour, an input seller, or an extension officer if one is near.",
  ),
  "PR-TWI-01": p("Preparing the Twi version."),
  "PR-RAT-01": p("Did this advice help you?"),
  "PR-RAT-02": p("Thank you. Do you want to say more? You can skip."),
  "PR-MEM-01": p("Last time you told me about"),
  "PR-MEM-02": p("Thank you. Please tell me what is right."),
  "PR-MEM-03": p("Done. I have forgotten that."),
  "PR-MEM-04": p("This is what I remember about you."),
  "PR-MEM-05": p(
    "I don't recognise this phone yet. Tap here to sign in and I will remember you.",
  ),
  "PR-OTP-01": p(
    "Please type your phone number, so I can remember you next time. I will send a code by SMS.",
  ),
  "PR-OTP-03": p("Your number is"),
  "PR-OTP-04": p("Waiting for the code by SMS."),
  "PR-OTP-05": p("The code has not come. Tap to send again, or ask for help."),
  "PR-OTP-06": p("That code is not right. Please try again."),
  "PR-OTP-07": p("Done. I will remember you."),
  "PR-OTP-08": p("I can help you type the code, one number at a time."),
  "PR-SET-01": p(
    "Deleting your account removes your number, conversations and memory. This cannot be undone. Are you sure?",
  ),
  "PR-SET-02": p("Your account is deleted."),
  "PR-ERR-01": p(
    "No connection. I kept your question and will send it when the network is back.",
  ),
  "PR-ERR-02": p("Something went wrong on our side. Please try again."),
  "PR-ERR-03": p(
    "I did not hear anything. Hold the phone closer and try again.",
  ),
  "PR-ERR-04": p(
    "I cannot play the sound right now. The answer is on the screen.",
  ),
  "PR-ERR-05": p(
    "This is taking too long. Please try again. I kept your question.",
  ),
  "PR-ERR-06": p(
    "Too many questions right now. Please try again in a few minutes.",
  ),
  "PR-HLP-01": p(
    "How to use this: tap the big button, speak, and wait for the answer. You can tap Hear again, or Stop.",
  ),
} satisfies Record<string, Prompt>

export type PromptId = keyof typeof prompts

export function promptText(id: PromptId): string {
  return prompts[id].en
}

/** Prompt clip for a language, or undefined when only the stand-in exists. */
export function promptAudio(id: PromptId, lang: Lang): string | undefined {
  return (prompts[id] as Prompt).audio[lang]
}

export function missingRecordings(lang: Lang): PromptId[] {
  return (Object.keys(prompts) as PromptId[]).filter(
    (id) => !promptAudio(id, lang),
  )
}
