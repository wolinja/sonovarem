/** S09 Delete account (mockups/J5): what is removed, spoken and shown, then a two-step confirm (P0-05 A8). */

import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { useApi } from "@/api"
import { playEarcon } from "@/audio/earcons"
import { promptText } from "@/audio/prompts"
import { retryBuffer } from "@/audio/retryBuffer"
import { usePrompt, usePromptsOnMount } from "@/features/shell/audioHooks"
import { PillButton } from "@/features/shell/buttons"
import { Icon } from "@/features/shell/Icon"
import { PageLayout } from "@/features/shell/PageLayout"
import { cn } from "@/lib/utils"
import { session } from "@/session/store"

type Step = "explain" | "confirm" | "deleting" | "done" | "failed"

export function DeleteAccountScreen() {
  const api = useApi()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const play = usePrompt()
  const [step, setStep] = useState<Step>("explain")
  usePromptsOnMount(["PR-SET-01"])

  const remove = async () => {
    setStep("deleting")
    try {
      if (session.get().user) await api.me.remove()
      await retryBuffer.clear()
      queryClient.clear()
      session.reset()
      setStep("done")
      playEarcon("E4")
      void play("PR-SET-02", { force: true })
    } catch {
      setStep("failed")
      void play("PR-ERR-02")
    }
  }

  const dangerClass =
    "border-2 border-problem bg-surface text-problem hover:bg-problem-bg"

  return (
    <PageLayout backTo="/settings" backLabel="Back to settings" centered>
      <section
        aria-labelledby="del-h"
        className="mx-auto flex w-full max-w-[640px] flex-col gap-5.5 rounded-card border border-line-subtle bg-surface p-6 shadow-card sm:p-9"
      >
        {step === "done" ? (
          <>
            <h1
              id="del-h"
              role="status"
              className="m-0 flex items-center gap-3 text-[28px] font-bold"
            >
              <Icon name="check_circle" fill size={34} className="text-brand" />
              {promptText("PR-SET-02")}
            </h1>
            <PillButton
              variant="primary"
              size="xl"
              icon="close"
              className="self-start"
              onClick={() => void navigate({ to: "/" })}
            >
              Close
            </PillButton>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4">
              {/* Problem tones, not the mockup's red (OQ-U11; see README) */}
              <span className="flex size-16 flex-none items-center justify-center rounded-full bg-problem-bg">
                <Icon
                  name="delete_forever"
                  size={34}
                  className="text-problem"
                />
              </span>
              <h1 id="del-h" className="m-0 flex-1 text-[28px] font-bold">
                {step === "explain" ? "Delete your account?" : "Are you sure?"}
              </h1>
              <button
                type="button"
                aria-label="Hear this"
                onClick={() => void play("PR-SET-01", { force: true })}
                className="inline-flex size-12 flex-none items-center justify-center rounded-full bg-sunken text-brand-deep"
              >
                <Icon name="volume_up" size={22} />
              </button>
            </div>
            <p className="m-0 text-[19px] leading-normal">
              This removes, from this phone and from our system:
            </p>
            <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
              {REMOVED.map(([icon, label]) => (
                <li
                  key={label}
                  className="flex items-center gap-3 rounded-row bg-sunken px-4 py-3.5 text-[17px]"
                >
                  <Icon name={icon} size={24} className="text-brand" />
                  {label}
                </li>
              ))}
            </ul>
            <p className="m-0 flex items-center gap-2.5 text-lg font-semibold text-problem">
              <Icon name="warning" size={22} />
              This cannot be undone.
            </p>
            {step === "failed" && (
              <p role="alert" className="m-0 text-lg text-problem">
                {promptText("PR-ERR-02")}
              </p>
            )}
            <div className="flex flex-wrap gap-3 pt-1">
              <PillButton
                variant="primary"
                size="xl"
                icon="shield"
                className="px-7 text-lg"
                onClick={() => void navigate({ to: "/settings" })}
              >
                Keep my account
              </PillButton>
              {step === "explain" ? (
                <PillButton
                  size="xl"
                  icon="delete_forever"
                  className={cn("px-7 text-lg", dangerClass)}
                  onClick={() => {
                    setStep("confirm")
                    void play("PR-SET-01")
                  }}
                >
                  Yes, delete everything
                </PillButton>
              ) : (
                <PillButton
                  size="xl"
                  icon="delete_forever"
                  className={cn("px-7 text-lg", dangerClass)}
                  disabled={step === "deleting"}
                  onClick={() => void remove()}
                >
                  Delete for good
                </PillButton>
              )}
            </div>
            <p className="m-0 text-[15px] text-ink-muted">
              {step === "explain"
                ? "I will ask you once more before deleting."
                : "This is the last check. Your account goes when you tap Delete for good."}
            </p>
          </>
        )}
      </section>
    </PageLayout>
  )
}

const REMOVED: [icon: string, label: string][] = [
  ["smartphone", "Your phone number"],
  ["forum", "Your conversations"],
  ["psychology_alt", "What I remember"],
  ["graphic_eq", "Any kept recordings"],
]
