/**
 * S07 Code (mockups/J3, P1-04 §3.4 steps 2–4): WebOTP auto-read, each number read back as it is
 * typed, guided entry after 20 s, resend after 30 s, and a large-type "Get help" view for a field
 * moderator. OTPInput is one input (paste and autofill work, WCAG 3.3.8) drawn as six slots.
 */

import { useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import { useApi, useMockControls } from "@/api"
import { ApiError } from "@/api/contract"
import { playEarcon } from "@/audio/earcons"
import { player } from "@/audio/player"
import { promptText } from "@/audio/prompts"
import { CONSENT_VERSION, supportContact } from "@/config/content"
import { scaled, timing } from "@/config/timing"
import {
  BackLink,
  OnboardingLayout,
  ReplayOnBrand,
} from "@/features/onboarding/OnboardingLayout"
import { usePrompt, usePromptsOnMount } from "@/features/shell/audioHooks"
import { PillButton } from "@/features/shell/buttons"
import { Icon } from "@/features/shell/Icon"
import { clock, useSecondsUntil } from "@/features/shell/useCountdown"
import { cn } from "@/lib/utils"
import { isVoiceMode, session, useSession } from "@/session/store"
import { signInFlow } from "./signInFlow"

type CodeState =
  | "waiting-sms"
  | "manual"
  | "guided"
  | "error"
  | "expired"
  | "locked"
  | "checking"

const LENGTH = 6

export function CodeScreen() {
  const api = useApi()
  const mock = useMockControls()
  const navigate = useNavigate()
  const play = usePrompt()
  // Before a mode is chosen (returning user from S01), assume voice: Twi is the default.
  const voice = useSession((s) => s.mode === null || isVoiceMode(s.mode))
  // Snapshot: clearing the flow after success must not re-trigger the "no sign-in" redirect.
  const [flow, setFlow] = useState(() => signInFlow.get())
  const [code, setCode] = useState("")
  const [state, setState] = useState<CodeState>("waiting-sms")
  const [wrongCount, setWrongCount] = useState(0)
  const [resendAt, setResendAt] = useState<number>()
  const [guidedOffer, setGuidedOffer] = useState(false)
  const [helper, setHelper] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const resendSeconds = useSecondsUntil(resendAt)

  usePromptsOnMount(["PR-OTP-04"], !!flow)

  // No sign-in in progress (e.g. after a reload): start again at S06.
  useEffect(() => {
    if (!flow) void navigate({ to: "/sign-in", replace: true })
  }, [flow, navigate])

  // Resend after 30 s; offer guided entry after 20 s without an auto-read.
  const requestId = flow?.requestId
  useEffect(() => {
    if (!requestId) return
    setResendAt(Date.now() + scaled(timing.otpResendMs))
    const resend = setTimeout(
      () => void play("PR-OTP-05"),
      scaled(timing.otpResendMs),
    )
    const guided = setTimeout(
      () => setGuidedOffer(true),
      scaled(timing.otpGuidedOfferMs),
    )
    return () => {
      clearTimeout(resend)
      clearTimeout(guided)
    }
  }, [requestId, play])

  const verify = useCallback(
    async (value: string) => {
      const current = signInFlow.get()
      if (!current) return
      setState("checking")
      try {
        const res = await api.auth.verifyOtp({
          request_id: current.requestId,
          code: value,
        })
        playEarcon("E4")
        void play("PR-OTP-07")
        if (current.memoryConsent !== undefined) {
          await api.consent.record({
            version: CONSENT_VERSION,
            mode: session.get().mode ?? res.user.mode,
            layers: { memory: current.memoryConsent },
            method: "tap",
          })
        }
        const s = session.get()
        // The server holds age and service consent for a known account (new-device sign-in).
        session.set({
          user: { id: res.user.id, phoneLast4: res.user.phone_last4 },
          memoryConsent: current.memoryConsent,
          mode: s.mode ?? res.user.mode,
          age: s.age ?? (res.needs.age ? null : { is18: true, method: "tap" }),
          consent:
            s.consent ??
            (res.needs.consent.includes("service")
              ? null
              : {
                  version: CONSENT_VERSION,
                  method: "tap",
                  at: new Date().toISOString(),
                }),
          savePromptDismissed: true,
        })
        signInFlow.clear()
        const next = session.get()
        await navigate({
          to: !next.consent
            ? "/consent"
            : isVoiceMode(next.mode) && next.micStatus === "unknown"
              ? "/microphone"
              : "/ask",
        })
      } catch (err) {
        const codeErr = err instanceof ApiError ? err.code : "server"
        setCode("")
        if (codeErr === "otp_locked") {
          setState("locked")
        } else if (codeErr === "otp_expired") {
          setState("expired")
        } else {
          setState("error")
          setWrongCount((n) => n + 1)
          setShake(true)
          setTimeout(() => setShake(false), 400)
          void play("PR-OTP-06")
        }
        inputRef.current?.focus()
      }
    },
    [api, navigate, play],
  )

  // WebOTP on Android Chrome: read the SMS code automatically.
  useEffect(() => {
    if (!flow || !("OTPCredential" in window)) return
    const ac = new AbortController()
    navigator.credentials
      .get({
        otp: { transport: ["sms"] },
        signal: ac.signal,
      } as CredentialRequestOptions)
      .then((cred) => {
        const otp = (cred as unknown as { code?: string } | null)?.code
        if (otp) {
          setCode(otp)
          void verify(otp)
        }
      })
      .catch(() => {})
    return () => ac.abort()
  }, [flow, verify])

  const onChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, LENGTH)
    // Each number is read back as it is typed (mockups/J3 S07).
    if (voice && digits.length > code.length) {
      void player.say(digits.at(-1) ?? "")
    }
    setCode(digits)
    if (state === "error" || state === "waiting-sms")
      setState(state === "error" ? "manual" : state)
    if (digits.length === LENGTH) void verify(digits)
  }

  const resend = async () => {
    const current = signInFlow.get()
    if (!current) return
    try {
      const res = await api.auth.requestOtp({
        phone: current.phone,
        turnstile_token: "mock-turnstile",
      })
      const next = { ...current, requestId: res.request_id }
      signInFlow.set(next)
      setFlow(next)
      setState("waiting-sms")
      setWrongCount(0)
      setCode("")
    } catch {
      void play("PR-ERR-02")
    }
  }

  if (!flow) return null

  const nextSlot = Math.min(code.length, LENGTH - 1)
  const canResend =
    (resendSeconds === 0 || state === "expired" || wrongCount >= 3) &&
    state !== "locked"
  const speaking =
    state === "guided" && code.length < LENGTH
      ? `Type the ${ORDINALS[code.length]} number.`
      : state === "error"
        ? promptText("PR-OTP-06")
        : promptText("PR-OTP-04")
  const status = STATUS[state]

  return (
    <OnboardingLayout
      speaking={`“${speaking}”`}
      asideBody={
        voice && (
          <>
            <p className="m-0 text-lg leading-relaxed font-medium text-on-brand-soft sm:text-xl">
              I read each number back to you as you type it.
            </p>
            <ReplayOnBrand onClick={() => void player.say(speaking)} />
          </>
        )
      }
      asideFooter="You can paste the code too."
      topLeft={<BackLink to="/sign-in">Change number</BackLink>}
    >
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-7">
        <div className="flex items-center gap-5">
          <span className="flex size-18 flex-none items-center justify-center rounded-full bg-lime-tint">
            <Icon name="sms" size={38} className="text-brand" />
          </span>
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 text-[28px] leading-tight font-bold sm:text-[34px]">
              Enter the code
            </h1>
            <p className="m-0 text-lg text-ink-muted">
              Sent by SMS to the number ending{" "}
              <span className="font-ui tabular-nums">
                {flow.phone.slice(-2)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <label
            htmlFor={inputId}
            className="font-ui text-[15px] font-semibold"
          >
            6-number code
          </label>
          <div
            className={cn(
              "relative w-full max-w-[468px]",
              shake && "animate-shake",
            )}
          >
            <input
              ref={inputRef}
              id={inputId}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={LENGTH}
              value={code}
              disabled={state === "locked" || state === "checking"}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && code.length === LENGTH && void verify(code)
              }
              aria-invalid={state === "error"}
              aria-describedby={`${inputId}-status`}
              className="peer absolute inset-0 z-1 h-full w-full cursor-text opacity-0"
            />
            <div aria-hidden="true" className="grid grid-cols-6 gap-2 sm:gap-3">
              {Array.from({ length: LENGTH }, (_, i) => {
                const current =
                  i === nextSlot &&
                  code.length < LENGTH &&
                  state !== "checking" &&
                  state !== "locked"
                return (
                  <span
                    key={i}
                    className={cn(
                      "flex aspect-[68/84] items-center justify-center rounded-input bg-surface font-ui font-semibold tabular-nums",
                      helper
                        ? "text-5xl sm:text-6xl"
                        : "text-3xl sm:text-[38px]",
                      state === "error"
                        ? "border-2 border-problem"
                        : current
                          ? "items-end border-3 border-brand bg-lime-tint pb-[18px] ring-4 ring-highlight"
                          : "border-2 border-line",
                    )}
                  >
                    {code[i] ??
                      (current && (
                        <span className="h-0.75 w-7 rounded-xs bg-brand motion-safe:animate-pulse" />
                      ))}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        <div
          id={`${inputId}-status`}
          role="status"
          className={cn(
            "flex items-center gap-3 rounded-panel px-5 py-4 text-[17px]",
            status.problem
              ? "bg-problem-bg text-problem"
              : "bg-sunken text-ink-muted",
          )}
        >
          <Icon
            name={status.icon}
            size={24}
            className={status.problem ? undefined : "text-brand"}
          />
          <span>
            {state === "guided"
              ? `Type number ${code.length + 1} of ${LENGTH}.`
              : status.text}
            {state === "error" &&
              wrongCount >= 3 &&
              " You can ask for a new code."}
            {state === "locked" && ` ${supportContact.label}.`}
          </span>
        </div>

        {mock && (
          <p className="m-0 rounded-row border border-dashed border-attention-line bg-attention-bg px-4 py-2 font-ui text-sm text-attention">
            Mock mode: no SMS is sent. The code is {mock.otpCode}.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <PillButton
            variant="primary"
            size="xl"
            iconAfter="arrow_forward"
            disabled={code.length !== LENGTH || state === "checking"}
            onClick={() => void verify(code)}
          >
            Continue
          </PillButton>
          <PillButton
            size="lg"
            icon="refresh"
            disabled={!canResend}
            className="disabled:border-line-input disabled:text-ink-muted disabled:opacity-100"
            onClick={() => void resend()}
          >
            {canResend || resendSeconds === undefined
              ? "Send again"
              : `Send again in ${clock(resendSeconds)}`}
          </PillButton>
          <PillButton
            size="lg"
            icon="support_agent"
            onClick={() => setHelper((h) => !h)}
          >
            {helper ? "Normal size" : "Get help"}
          </PillButton>
          {(guidedOffer || state === "error") &&
            state !== "guided" &&
            voice && (
              <PillButton
                size="lg"
                icon="dialpad"
                onClick={() => {
                  setState("guided")
                  void play("PR-OTP-08")
                  inputRef.current?.focus()
                }}
              >
                Help me type it
              </PillButton>
            )}
        </div>
        {helper && (
          <p className="m-0 rounded-row bg-lime-tint px-4 py-3 text-lg">
            {supportContact.label}. They can type the code from the SMS into the
            boxes above.
          </p>
        )}
      </div>
    </OnboardingLayout>
  )
}

const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth"]

const STATUS: Record<
  CodeState,
  { icon: string; text: string; problem?: boolean }
> = {
  "waiting-sms": {
    icon: "hourglass_top",
    text: "Waiting for the SMS. When it arrives, I will fill the code in for you.",
  },
  manual: {
    icon: "dialpad",
    text: "Type the 6 numbers from the SMS, then tap Continue.",
  },
  guided: { icon: "dialpad", text: "" },
  checking: { icon: "hourglass_top", text: "Checking…" },
  error: { icon: "error", text: promptText("PR-OTP-06"), problem: true },
  expired: {
    icon: "timer_off",
    text: "This code has expired. Ask for a new one.",
    problem: true,
  },
  locked: {
    icon: "lock_clock",
    text: "Too many tries. Please wait a few minutes.",
    problem: true,
  },
}
