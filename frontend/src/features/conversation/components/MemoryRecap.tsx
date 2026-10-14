/**
 * S05e Memory recap (UP7, mockups/J4): say what is remembered before using it; the farmer can
 * correct or forget each item. Corrections are confirmed with a toast.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"
import { useApi } from "@/api"
import type { MemoryItem } from "@/api/contract"
import { player } from "@/audio/player"
import { promptText } from "@/audio/prompts"
import { PillButton } from "@/features/shell/buttons"
import { Icon } from "@/features/shell/Icon"
import { Toast } from "@/features/shell/Toast"
import { isVoiceMode, session, useSession } from "@/session/store"

const KIND_ICON: Record<NonNullable<MemoryItem["kind"]>, string> = {
  farm: "agriculture",
  problem: "pest_control",
  crop: "grass",
  other: "bookmark",
}

/** "Your maize farm near [TOWN]" → "your maize farm near [TOWN]", mid-sentence. */
const lowerFirst = (text: string) =>
  text.charAt(0).toLowerCase() + text.slice(1)

const recapSpeech = (items: MemoryItem[]) =>
  `${promptText("PR-MEM-01")}: ${items.map((i) => lowerFirst(i.summary_en)).join(", ")}.`

export function MemoryRecap() {
  const api = useApi()
  const queryClient = useQueryClient()
  const signedIn = useSession((s) => !!s.user)
  const mode = useSession((s) => s.mode)
  const [dismissed, setDismissed] = useState(false)
  const [toast, setToast] = useState<string>()
  const hideToast = useCallback(() => setToast(undefined), [])
  const spoken = useRef(false)

  const memory = useQuery({
    queryKey: ["memory"],
    queryFn: () => api.memory.list(),
    enabled: signedIn,
  })
  const items = memory.data ?? []

  const done = (message: string) => {
    setToast(message)
    if (isVoiceMode(mode)) void player.say(message)
    void queryClient.invalidateQueries({ queryKey: ["memory"] })
  }
  const forget = useMutation({
    mutationFn: (item: MemoryItem) => api.memory.forget(item.id),
    onSuccess: (_, item) =>
      done(`Done. I have forgotten ${lowerFirst(item.summary_en)}.`),
  })
  const wrong = useMutation({
    mutationFn: (item: MemoryItem) => api.memory.markWrong(item.id),
    onSuccess: () => done(promptText("PR-MEM-02")),
  })

  useEffect(() => {
    if (!items.length || spoken.current || !isVoiceMode(mode)) return
    if (session.get().prefs.noAutoPrompts) return
    spoken.current = true
    void player.say(recapSpeech(items))
  }, [items, mode])

  if (dismissed || (!items.length && !toast)) return null

  return (
    <>
      {items.length > 0 && (
        <section
          aria-labelledby="recap-h"
          className="flex flex-col gap-5.5 rounded-card border border-line-subtle bg-surface p-6 shadow-card sm:p-8"
        >
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex size-14 flex-none items-center justify-center rounded-full bg-lime-tint">
              <Icon name="waving_hand" size={30} className="text-brand" />
            </span>
            <div className="flex flex-1 flex-col gap-0.5">
              <h1 id="recap-h" className="m-0 text-[28px] font-bold">
                Welcome back
              </h1>
              <p className="m-0 text-lg text-ink-muted">
                Last time you told me about:
              </p>
            </div>
            <PillButton
              icon="replay"
              className="min-h-11 px-4 text-[15px]"
              onClick={() => void player.say(recapSpeech(items))}
            >
              Hear again
            </PillButton>
          </div>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-4 rounded-panel bg-sunken px-5 py-4.5"
              >
                <Icon
                  name={KIND_ICON[item.kind ?? "other"]}
                  size={28}
                  className="flex-none text-brand"
                />
                <span className="flex-[1_1_220px] text-[19px] font-semibold">
                  {item.summary_en}
                </span>
                <span className="flex flex-wrap gap-2">
                  <PillButton
                    icon="edit"
                    className="px-4 text-[15px]"
                    aria-label={`That's wrong: ${item.summary_en}`}
                    onClick={() => wrong.mutate(item)}
                  >
                    That's wrong
                  </PillButton>
                  <PillButton
                    variant="outline-muted"
                    icon="auto_delete"
                    className="px-4 text-[15px]"
                    aria-label={`Forget this: ${item.summary_en}`}
                    onClick={() => forget.mutate(item)}
                  >
                    Forget this
                  </PillButton>
                </span>
              </li>
            ))}
          </ul>
          <PillButton
            variant="primary"
            size="xl"
            iconAfter="arrow_forward"
            className="self-start"
            onClick={() => setDismissed(true)}
          >
            Continue
          </PillButton>
        </section>
      )}
      <Toast message={toast} onHide={hideToast} />
    </>
  )
}
