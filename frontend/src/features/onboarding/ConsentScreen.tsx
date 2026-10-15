/**
 * S03 Age gate + layer-1 consent (mockups/J1/S03, P1-04 §2.4). Nothing is stored before both
 * answers. Voice yes/no needs ASR, so for now the farmer taps; the screen still speaks every step.
 */

import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { useApi } from "@/api"
import { promptText } from "@/audio/prompts"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { CONSENT_VERSION } from "@/config/content"
import { usePrompt, usePromptsOnMount } from "@/features/shell/audioHooks"
import { DecisionDisc, PillButton } from "@/features/shell/buttons"
import { Icon } from "@/features/shell/Icon"
import { isVoiceMode, session, useSession } from "@/session/store"
import { OnboardingLayout, ReplayOnBrand } from "./OnboardingLayout"

export function ConsentScreen() {
  const api = useApi()
  const navigate = useNavigate()
  const play = usePrompt()
  const mode = useSession((s) => s.mode) ?? "twi_voice"
  const age = useSession((s) => s.age)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const [fullTextOpen, setFullTextOpen] = useState(false)
  const askingAge = !age?.is18

  usePromptsOnMount(askingAge ? ["PR-AGE-01"] : ["PR-CON-01", "PR-CON-02"])

  const consent = useQuery({
    queryKey: ["consent", mode],
    queryFn: () => api.consent.current(mode),
  })

  const answerAge = async (is18: boolean) => {
    if (!is18) {
      await navigate({ to: "/under-18" })
      return
    }
    session.set({ age: { is18: true, method: "tap" } })
  }

  const agree = async () => {
    setSaving(true)
    setFailed(false)
    try {
      const res = await api.sessions.provisional({
        turnstile_token: "mock-turnstile",
        mode,
        age: { is_18_or_older: true },
        consent: {
          version: CONSENT_VERSION,
          layers: { service: true },
          method: "tap",
        },
      })
      await api.consent.record({
        version: CONSENT_VERSION,
        mode,
        layers: { service: true },
        method: "tap",
      })
      session.set({
        provisionalUserId: res.user.id,
        consent: {
          version: CONSENT_VERSION,
          method: "tap",
          at: new Date().toISOString(),
        },
      })
      await navigate({ to: isVoiceMode(mode) ? "/microphone" : "/ask" })
    } catch {
      setFailed(true)
      void play("PR-ERR-02")
    } finally {
      setSaving(false)
    }
  }

  const decline = async () => {
    // Nothing is stored without consent.
    session.reset()
    await navigate({ to: "/" })
  }

  const speaking = askingAge ? promptText("PR-AGE-01") : promptText("PR-CON-02")

  return (
    <OnboardingLayout
      step={3}
      speaking={`“${speaking}”`}
      asideBody={
        <ReplayOnBrand
          onClick={() =>
            void play(askingAge ? "PR-AGE-01" : "PR-CON-01", { force: true })
          }
        >
          {askingAge ? "Hear again" : "Hear the summary again"}
        </ReplayOnBrand>
      }
    >
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-5">
        {askingAge ? (
          <section className="flex flex-col gap-8 rounded-card border border-line-subtle bg-surface p-6 shadow-card sm:p-8">
            <div className="flex items-center gap-4">
              <span className="flex size-16 flex-none items-center justify-center rounded-full bg-lime-tint">
                <Icon name="person" size={32} className="text-brand" />
              </span>
              <h1 className="m-0 text-[28px] leading-tight font-bold">
                Are you 18 or older?
              </h1>
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              <DecisionDisc
                kind="yes"
                label="Yes"
                aria-label="Yes, I am 18 or older"
                onClick={() => void answerAge(true)}
              />
              <DecisionDisc
                kind="no"
                label="No"
                aria-label="No, I am under 18"
                onClick={() => void answerAge(false)}
              />
            </div>
          </section>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-row border border-line-subtle bg-lime-tint px-5 py-3.5">
              <Icon name="check_circle" fill size={26} className="text-brand" />
              <span className="flex-1 text-lg">
                <strong className="font-semibold">Are you 18 or older?</strong>{" "}
                You said yes.
              </span>
              <button
                type="button"
                onClick={() => session.set({ age: null })}
                className="inline-flex min-h-11 items-center rounded-full bg-transparent px-4 font-ui text-[15px] font-semibold text-brand-deep hover:bg-surface"
              >
                Change
              </button>
            </div>
            <section className="flex flex-col gap-6 rounded-card border border-line-subtle bg-surface p-6 shadow-card sm:p-8">
              <h1 className="m-0 text-[28px] leading-tight font-bold">
                Before you ask
              </h1>
              <div
                className="flex flex-wrap items-center gap-3"
                aria-hidden="true"
              >
                {["mic", "cloud", "delete"].map((icon, i) => (
                  <span key={icon} className="flex items-center gap-3">
                    {i > 0 && (
                      <Icon
                        name="arrow_forward"
                        size={24}
                        className="text-line"
                      />
                    )}
                    <span className="flex size-16 items-center justify-center rounded-full bg-lime-tint">
                      <Icon name={icon} size={32} className="text-brand" />
                    </span>
                  </span>
                ))}
              </div>
              {consent.data ? (
                <ul className="m-0 flex list-disc flex-col gap-2.5 pl-5.5 text-lg leading-relaxed">
                  {consent.data.summary.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <div className="h-32 animate-pulse rounded-row bg-sunken" />
              )}
              <p className="m-0 text-base text-ink-muted">
                Run by {consent.data?.controller ?? "…"}.{" "}
                <button
                  type="button"
                  onClick={() => setFullTextOpen(true)}
                  className="bg-transparent p-0 font-semibold text-brand-deep underline"
                >
                  Read the full text
                </button>
              </p>
              {failed && (
                <p
                  role="alert"
                  className="m-0 flex items-center gap-2 rounded-row bg-problem-bg px-4 py-3 text-problem"
                >
                  <Icon name="warning" size={22} />
                  {promptText("PR-ERR-02")}
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-6 pt-2">
                <DecisionDisc
                  kind="yes"
                  label="Yes, I agree"
                  disabled={saving || !consent.data}
                  onClick={() => void agree()}
                />
                <DecisionDisc
                  kind="no"
                  label="No"
                  disabled={saving}
                  onClick={() => void decline()}
                />
              </div>
            </section>
          </>
        )}
      </div>
      <Dialog open={fullTextOpen} onOpenChange={setFullTextOpen}>
        <DialogContent
          showCloseButton={false}
          className="rounded-card bg-surface p-8"
        >
          <DialogTitle className="text-2xl font-bold">
            Full consent text
          </DialogTitle>
          <DialogDescription className="text-lg leading-relaxed text-ink-muted">
            The full text (version {CONSENT_VERSION}) is being drafted for the
            IRB package. It will name the controller, every provider and
            country, how long data is kept, and how to delete it.
          </DialogDescription>
          <PillButton variant="primary" onClick={() => setFullTextOpen(false)}>
            Close
          </PillButton>
        </DialogContent>
      </Dialog>
    </OnboardingLayout>
  )
}
