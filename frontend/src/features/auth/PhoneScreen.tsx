/**
 * S06 Save me / Sign in (mockups/J3, P1-04 §3.4 step 1): the phone number, each digit spoken as it
 * is typed, with memory consent (layer 2) and recordings consent (layer 3, off until IRB allows it)
 * asked on the same screen.
 */

import { useNavigate } from "@tanstack/react-router"
import { useId, useState } from "react"
import { useApi } from "@/api"
import { ApiError } from "@/api/contract"
import { player } from "@/audio/player"
import { type PromptId, promptText } from "@/audio/prompts"
import { RECORDINGS_CONSENT_AVAILABLE } from "@/config/content"
import {
  BackLink,
  OnboardingLayout,
  ReplayOnBrand,
} from "@/features/onboarding/OnboardingLayout"
import { usePrompt, usePromptsOnMount } from "@/features/shell/audioHooks"
import { PillButton } from "@/features/shell/buttons"
import { Icon } from "@/features/shell/Icon"
import { cn } from "@/lib/utils"
import { isVoiceMode, useSession } from "@/session/store"
import { normalizeGhanaPhone, signInFlow } from "./signInFlow"

export function PhoneScreen() {
  const api = useApi()
  const navigate = useNavigate()
  const play = usePrompt()
  // Before a mode is chosen (returning user from S01), assume voice: Twi is the default.
  const voice = useSession((s) => s.mode === null || isVoiceMode(s.mode))
  const hasConsent = useSession((s) => !!s.consent)
  const signedIn = useSession((s) => !!s.user)
  const [raw, setRaw] = useState("")
  const [memory, setMemory] = useState<boolean>()
  const [recordings, setRecordings] = useState(false)
  const [error, setError] = useState<string>()
  const [sending, setSending] = useState(false)
  const inputId = useId()

  usePromptsOnMount(["PR-OTP-01"])

  const onType = (value: string) => {
    const cleaned = value.replace(/[^\d+\s]/g, "")
    const added =
      cleaned.replace(/\D/g, "").length > raw.replace(/\D/g, "").length
    setRaw(cleaned)
    setError(undefined)
    const last = cleaned.replace(/\D/g, "").at(-1)
    // Each digit is spoken as it is typed (PR-OTP-02 digit clips; stand-in for now).
    if (voice && added && last) void player.say(last)
  }

  const sendCode = async () => {
    const phone = normalizeGhanaPhone(raw)
    if (!phone) {
      setError("Please type a Ghana phone number, like 024 123 4567.")
      return
    }
    setSending(true)
    setError(undefined)
    try {
      const res = await api.auth.requestOtp({
        phone,
        turnstile_token: "mock-turnstile",
      })
      signInFlow.set({
        phone,
        requestId: res.request_id,
        // Not answered counts as no: memory is opt-in (P1-04 §2.4).
        memoryConsent: memory === true,
        resendAfterS: res.resend_after_s,
      })
      await navigate({ to: "/sign-in/code" })
    } catch (err) {
      const offline = err instanceof ApiError && err.code === "offline"
      setError(
        offline
          ? promptText("PR-ERR-01").split(".")[0]
          : promptText("PR-ERR-02"),
      )
      void play(offline ? "PR-ERR-01" : "PR-ERR-02")
    } finally {
      setSending(false)
    }
  }

  return (
    <OnboardingLayout
      speaking={`“${promptText("PR-OTP-01")}”`}
      asideBody={
        voice && (
          <ReplayOnBrand
            onClick={() => void play("PR-OTP-01", { force: true })}
          />
        )
      }
      asideFooter={voice && "Each number is read aloud as you type it."}
      topLeft={<BackLink to={hasConsent ? "/ask" : "/"}>Not now</BackLink>}
    >
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <div className="flex items-center gap-5">
          <span className="flex size-18 flex-none items-center justify-center rounded-full bg-lime-tint">
            <Icon name="smartphone" size={38} className="text-brand" />
          </span>
          <h1 className="m-0 text-[28px] leading-tight font-bold sm:text-[34px]">
            Save me, so I remember you
          </h1>
        </div>

        <div className="flex flex-col gap-2.5">
          <label
            htmlFor={inputId}
            className="font-ui text-[15px] font-semibold"
          >
            Your phone number
          </label>
          <div className="flex items-stretch overflow-hidden rounded-full border-2 border-line bg-surface focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-brand-deep">
            <span className="inline-flex flex-none items-center bg-sunken px-4 font-ui text-[22px] font-semibold text-ink-muted tabular-nums sm:px-5">
              +233
            </span>
            <input
              id={inputId}
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              value={raw}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void sendCode()}
              placeholder="0XX XXX XXXX"
              aria-invalid={!!error}
              aria-describedby={error ? `${inputId}-err` : undefined}
              className="min-h-17 min-w-0 flex-1 border-none bg-transparent px-4 font-ui text-2xl font-semibold tracking-[0.06em] text-ink tabular-nums outline-none sm:px-5 sm:text-[30px]"
            />
          </div>
          {error && (
            <p
              id={`${inputId}-err`}
              role="alert"
              className="m-0 text-lg text-problem"
            >
              {error}
            </p>
          )}
        </div>

        <section className="flex flex-col gap-5 rounded-card border border-line-subtle bg-surface px-5 py-6 sm:px-7">
          <ConsentQuestion
            icon="psychology_alt"
            prompt="PR-CON-03"
            value={memory}
            onChange={setMemory}
            onHear={() => void play("PR-CON-03", { force: true })}
          />
          <div className="h-px bg-line-subtle" />
          <ConsentQuestion
            icon="record_voice_over"
            prompt="PR-CON-04"
            value={recordings}
            onChange={setRecordings}
            yesDisabled={!RECORDINGS_CONSENT_AVAILABLE}
            note={
              RECORDINGS_CONSENT_AVAILABLE
                ? undefined
                : "Not asked yet: your voice recordings are not kept."
            }
            onHear={() => void play("PR-CON-04", { force: true })}
          />
        </section>

        <div className="flex flex-wrap items-center gap-4">
          <PillButton
            variant="primary"
            size="xl"
            iconAfter="arrow_forward"
            disabled={sending}
            onClick={() => void sendCode()}
          >
            Send me a code
          </PillButton>
        </div>
        <p className="m-0 text-base text-ink-muted">
          {signedIn
            ? "You are already signed in on this phone."
            : "Signing in on a new phone? Use the same number and I will remember you."}
        </p>
      </div>
    </OnboardingLayout>
  )
}

/** One consent layer: question, Hear this, and Yes / No toggle pills (mockups/J3 S06). */
function ConsentQuestion({
  icon,
  prompt,
  value,
  onChange,
  onHear,
  yesDisabled = false,
  note,
}: {
  icon: string
  prompt: PromptId
  value?: boolean
  onChange: (value: boolean) => void
  onHear: () => void
  yesDisabled?: boolean
  note?: string
}) {
  const questionId = useId()
  const option = (yes: boolean) => {
    const pressed = value === yes
    return (
      <button
        type="button"
        aria-pressed={pressed}
        disabled={yes && yesDisabled}
        onClick={() => onChange(yes)}
        className={cn(
          "inline-flex min-h-13 items-center gap-2 rounded-full px-6 font-ui text-[17px] font-semibold disabled:cursor-not-allowed disabled:opacity-50",
          pressed
            ? "border-2 border-brand bg-lime-tint text-brand-deep"
            : "border border-line bg-surface text-ink",
        )}
      >
        <Icon
          name={pressed ? "radio_button_checked" : yes ? "check" : "close"}
          fill={pressed}
          size={22}
          className={
            pressed ? undefined : yes ? "text-brand" : "text-ink-muted"
          }
        />
        {yes ? "Yes" : "No"}
      </button>
    )
  }
  return (
    // biome-ignore lint/a11y/useSemanticElements: a labelled pair of toggle buttons
    <div
      role="group"
      aria-labelledby={questionId}
      className="flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        <Icon name={icon} size={26} className="flex-none text-brand" />
        <p id={questionId} className="m-0 flex-1 text-lg leading-normal">
          {promptText(prompt)}
        </p>
        <button
          type="button"
          aria-label="Hear this"
          onClick={onHear}
          className="inline-flex size-11 flex-none items-center justify-center rounded-full bg-sunken text-brand-deep"
        >
          <Icon name="volume_up" size={20} />
        </button>
      </div>
      <div className="flex flex-wrap gap-3 pl-9.5">
        {option(true)}
        {option(false)}
      </div>
      {note && <p className="m-0 pl-9.5 text-base text-ink-muted">{note}</p>}
    </div>
  )
}
