/**
 * One audio channel for prompts, echo-back and answer clips: starting a sound stops the previous
 * one, so the farmer never hears two voices. Clip URLs may be real (`https:`/`blob:`) or mock
 * (`speech:<lang>:<text>`, spoken by the dev stand-in; `speech:fail` simulates a TTS failure).
 */

import type { Lang } from "@/api/contract"
import { devFlags } from "@/config/devFlags"
import { type SpeakHandle, speakStandIn } from "./devSpeech"
import { audioContext } from "./earcons"
import { type PromptId, promptAudio, promptText } from "./prompts"

export type PlayResult = "ended" | "stopped" | "blocked" | "failed"

type Listener = (playing: boolean) => void

let current: { stop(): void } | undefined
let playing = false
const listeners = new Set<Listener>()

function setPlaying(value: boolean) {
  if (playing === value) return
  playing = value
  for (const l of listeners) l(value)
}

function playElement(url: string): {
  done: Promise<PlayResult>
  stop(): void
} {
  const el = new Audio(url)
  let finish: (r: PlayResult) => void = () => {}
  const done = new Promise<PlayResult>((resolve) => {
    finish = resolve
  })
  el.onended = () => finish("ended")
  el.onerror = () => finish("failed")
  el.play().catch((err: unknown) => {
    finish(
      err instanceof DOMException && err.name === "NotAllowedError"
        ? "blocked"
        : "failed",
    )
  })
  return {
    done,
    stop() {
      el.pause()
      finish("stopped")
    },
  }
}

function standIn(handle: SpeakHandle): {
  done: Promise<PlayResult>
  stop(): void
} {
  return { done: handle.done, stop: () => handle.stop() }
}

export const player = {
  /** Call from a user gesture (S01). Unlocks WebAudio and speech so later playback is allowed. */
  async unlock(): Promise<boolean> {
    const c = audioContext()
    try {
      await c?.resume()
    } catch {
      return false
    }
    if (
      devFlags.audio !== "off" &&
      typeof window !== "undefined" &&
      window.speechSynthesis
    ) {
      // A silent utterance inside the gesture primes speech on mobile Chrome.
      const u = new SpeechSynthesisUtterance("")
      u.volume = 0
      window.speechSynthesis.speak(u)
    }
    return c?.state === "running" || !c
  },

  async playClip(url: string): Promise<PlayResult> {
    player.stop()
    let handle: { done: Promise<PlayResult>; stop(): void }
    if (url === "speech:fail") {
      return "failed"
    }
    if (url.startsWith("speech:")) {
      const [, lang, text] = url.split(":")
      handle = standIn(
        speakStandIn(decodeURIComponent(text ?? ""), lang as Lang),
      )
    } else if (devFlags.audio === "off") {
      handle = standIn(speakStandIn("(clip)", "en"))
    } else {
      handle = playElement(url)
    }
    current = handle
    setPlaying(true)
    const result = await handle.done
    if (current === handle) {
      current = undefined
      setPlaying(false)
    }
    return result
  },

  /** Plays a fixed prompt in the mode's language, or its stand-in until recorded. */
  async playPrompt(id: PromptId, lang: Lang = "en"): Promise<PlayResult> {
    const url = promptAudio(id, lang)
    if (url) return player.playClip(url)
    return player.playClip(
      `speech:${lang}:${encodeURIComponent(promptText(id))}`,
    )
  },

  /** Plays any text through the stand-in (dynamic content without a clip). */
  async say(text: string): Promise<PlayResult> {
    return player.playClip(`speech:en:${encodeURIComponent(text)}`)
  },

  stop() {
    const handle = current
    current = undefined
    handle?.stop()
    setPlaying(false)
  },

  isPlaying: () => playing,

  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
