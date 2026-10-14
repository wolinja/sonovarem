import { useCallback, useEffect, useSyncExternalStore } from "react"
import type { Lang } from "@/api/contract"
import { player } from "@/audio/player"
import type { PromptId } from "@/audio/prompts"
import { isVoiceMode, session, useSession } from "@/session/store"

/** True while any prompt, echo or answer clip is playing. */
export function usePlayerPlaying(): boolean {
  return useSyncExternalStore(
    (cb) => player.subscribe(() => cb()),
    () => player.isPlaying(),
    () => false,
  )
}

/** The language fixed prompts are spoken in. Before a mode is chosen, Twi (the primary user). */
export function usePromptLang(): Lang {
  return useSession((s) =>
    s.mode === "english_voice" || s.mode === "english_text" ? "en" : "tw",
  )
}

/**
 * Plays fixed prompts in the farmer's mode. Text mode, and the "Don't play prompts by themselves"
 * setting, never speak unless `force` (a tap on a "Hear this" button is always honoured).
 */
export function usePrompt() {
  const lang = usePromptLang()
  return useCallback(
    (id: PromptId, opts: { force?: boolean } = {}) => {
      const { mode, prefs } = session.get()
      if (!opts.force && mode && !isVoiceMode(mode))
        return Promise.resolve("ended" as const)
      if (!opts.force && prefs.noAutoPrompts)
        return Promise.resolve("stopped" as const)
      return player.playPrompt(id, lang)
    },
    [lang],
  )
}

/** Speaks a sequence of prompts when a screen opens (and stops them when it closes). */
export function usePromptsOnMount(ids: PromptId[], enabled = true) {
  const play = usePrompt()
  const key = ids.join(",")
  useEffect(() => {
    if (!enabled) return
    let alive = true
    void (async () => {
      for (const id of key.split(",") as PromptId[]) {
        if (!alive) return
        const r = await play(id)
        if (r !== "ended") return
      }
    })()
    return () => {
      alive = false
      player.stop()
    }
  }, [key, enabled, play])
}
