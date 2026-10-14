/**
 * Development stand-in for missing audio: the browser's speechSynthesis, or timed silence when it
 * is unavailable or audio is switched off (`?audio=off`). Every use is logged, because fixed
 * prompts must be real recordings before field use (P1-04 §11.4).
 */

import { devFlags } from "@/config/devFlags"
import { scaled } from "@/config/timing"

export type SpeakResult = "ended" | "stopped" | "failed"

export interface SpeakHandle {
  done: Promise<SpeakResult>
  stop(): void
}

/** Roughly how long the text takes to say, for the silent stand-in and as a safety timeout. */
export function estimateMs(text: string): number {
  const words = text.trim().split(/\s+/).length
  return Math.max(600, words * 380)
}

function silent(text: string): SpeakHandle {
  let finish: (r: SpeakResult) => void = () => {}
  const done = new Promise<SpeakResult>((resolve) => {
    finish = resolve
  })
  const timer = setTimeout(() => finish("ended"), scaled(estimateMs(text)))
  return {
    done,
    stop() {
      clearTimeout(timer)
      finish("stopped")
    },
  }
}

const logged = new Set<string>()

export function speakStandIn(
  text: string,
  lang: "en" | "tw" = "en",
): SpeakHandle {
  if (import.meta.env.DEV && !logged.has(text)) {
    logged.add(text)
    console.info(`[audio stand-in:${lang}] ${text}`)
  }
  const synth =
    typeof window !== "undefined" ? window.speechSynthesis : undefined
  if (devFlags.audio === "off" || !synth) return silent(text)

  let finish: (r: SpeakResult) => void = () => {}
  const done = new Promise<SpeakResult>((resolve) => {
    finish = resolve
  })
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = "en-GB"
  utterance.rate = 0.95
  utterance.onend = () => finish("ended")
  utterance.onerror = (e) =>
    finish(
      e.error === "interrupted" || e.error === "canceled"
        ? "stopped"
        : "failed",
    )
  // Some browsers never fire onend (no voices, background tab): do not hang the turn.
  const safety = setTimeout(() => finish("ended"), estimateMs(text) * 2 + 2000)
  done.finally(() => clearTimeout(safety))
  synth.cancel()
  synth.speak(utterance)
  return {
    done,
    stop() {
      synth.cancel()
      finish("stopped")
    },
  }
}
