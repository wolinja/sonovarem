/**
 * S04 Microphone explainer (mockups/J1/S04) and S04d denied state (mockups/J5, P1-04 §3.3).
 * The app speaks first and shows a picture of the button, then triggers the browser prompt.
 */

import { useNavigate } from "@tanstack/react-router"
import { type ReactNode, useState } from "react"
import { useApi } from "@/api"
import { promptText } from "@/audio/prompts"
import { requestMicrophone } from "@/audio/recorder"
import { usePrompt, usePromptsOnMount } from "@/features/shell/audioHooks"
import { PillButton } from "@/features/shell/buttons"
import { Icon } from "@/features/shell/Icon"
import { cn } from "@/lib/utils"
import { session, useSession } from "@/session/store"
import { OnboardingLayout, ReplayOnBrand } from "./OnboardingLayout"

export function MicrophoneScreen({
  denied: initiallyDenied = false,
}: {
  denied?: boolean
}) {
  const api = useApi()
  const navigate = useNavigate()
  const play = usePrompt()
  const mode = useSession((s) => s.mode) ?? "twi_voice"
  const [denied, setDenied] = useState(initiallyDenied)
  const [asking, setAsking] = useState(false)
  const [helperOpen, setHelperOpen] = useState(false)

  usePromptsOnMount([denied ? "PR-MIC-03" : "PR-MIC-01"])

  const allow = async () => {
    setAsking(true)
    const result = await requestMicrophone()
    setAsking(false)
    session.set({ micStatus: result })
    if (result === "denied") {
      setDenied(true)
      return
    }
    void api.sessions.warm(mode)
    void play("PR-MIC-02")
    await navigate({ to: "/ask" })
  }

  const typeInstead = async () => {
    session.set({ mode: "english_text" })
    await navigate({ to: "/ask" })
  }

  return (
    <OnboardingLayout
      step={denied ? undefined : 4}
      speaking={`“${promptText(denied ? "PR-MIC-03" : "PR-MIC-01")}”`}
      asideBody={
        <ReplayOnBrand
          onClick={() =>
            void play(denied ? "PR-MIC-03" : "PR-MIC-01", { force: true })
          }
        />
      }
    >
      <div
        className={cn(
          "mx-auto flex w-full flex-col",
          denied ? "max-w-[680px] gap-6" : "max-w-[640px] gap-7",
        )}
      >
        <div className="flex items-center gap-5">
          {/* Blocked uses the problem tones, not the mockup's red (OQ-U11; see README) */}
          <span
            className={cn(
              "flex size-18 flex-none items-center justify-center rounded-full",
              denied ? "bg-problem-bg" : "bg-lime-tint",
            )}
          >
            <Icon
              name={denied ? "mic_off" : "mic"}
              fill={!denied}
              size={38}
              className={denied ? "text-problem" : "text-brand"}
            />
          </span>
          <h1
            className={cn(
              "m-0 leading-tight font-bold",
              denied ? "text-[28px] sm:text-[32px]" : "text-3xl sm:text-[34px]",
            )}
          >
            {denied ? "The microphone is blocked" : "Let Sonovarem hear you"}
          </h1>
        </div>

        {denied ? <BlockedPicture /> : <AllowPicture />}

        {helperOpen && (
          <p className="m-0 rounded-row bg-lime-tint px-5 py-4 text-lg leading-relaxed">
            Ask someone near you to open the browser's site settings (the lock
            or settings icon next to the address), choose Microphone, and set it
            to Allow. Then tap “Try again”.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <PillButton
            variant="primary"
            size="xl"
            iconAfter={denied ? undefined : "arrow_forward"}
            icon={denied ? "refresh" : undefined}
            disabled={asking}
            onClick={() => void allow()}
          >
            {denied ? "Try again" : "Continue"}
          </PillButton>
          {!denied && (
            <PillButton
              variant="outline-muted"
              size="lg"
              icon="block"
              onClick={() => setDenied(true)}
            >
              I tapped Block
            </PillButton>
          )}
          <PillButton
            variant="outline"
            size="lg"
            icon="keyboard"
            onClick={() => void typeInstead()}
          >
            Type instead
          </PillButton>
          {denied && (
            <PillButton
              variant="outline"
              size="lg"
              icon="group"
              aria-expanded={helperOpen}
              onClick={() => setHelperOpen((o) => !o)}
            >
              Ask someone to help
            </PillButton>
          )}
        </div>
      </div>
    </OnboardingLayout>
  )
}

function AllowPicture() {
  return (
    <figure className="m-0 flex flex-col gap-4 rounded-card bg-sunken p-6 sm:p-8">
      <figcaption className="font-ui text-sm font-semibold text-ink-muted">
        This box will appear at the top of your browser
      </figcaption>
      <div
        role="img"
        aria-label="Picture of the browser box. Tap Allow."
        className="flex max-w-[420px] flex-col gap-4 rounded-input border border-line-input bg-surface px-6 py-5 font-[system-ui] shadow-[0_6px_24px_rgba(0,0,0,0.10)]"
      >
        <div className="text-base">sonovarem.app wants to</div>
        <div className="flex items-center gap-2.5 text-base">
          <Icon name="mic" size={22} className="text-ink-muted" />
          Use your microphones
        </div>
        <div className="flex items-center justify-end gap-3">
          <span className="rounded-full border border-line-input px-4.5 py-2 text-[15px] text-ink-muted">
            Block
          </span>
          <span className="rounded-full bg-[#1a5fb4] px-4.5 py-2 text-[15px] font-semibold text-white outline-4 outline-offset-4 outline-lime">
            Allow
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2.5 text-xl font-semibold text-brand-deep">
        <Icon name="touch_app" size={28} />
        Tap “Allow”
      </div>
    </figure>
  )
}

/** S04d (mockups/J5): three numbered steps, each with a small picture. */
function BlockedPicture() {
  return (
    <ol className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-3">
      <Step n={1} text="Tap the small icon next to the web address">
        <div
          role="img"
          aria-label="Address bar with the settings icon on the left circled"
          className="flex items-center gap-2 rounded-full bg-sunken px-3 py-2 font-[system-ui] text-[13px] text-ink-muted"
        >
          <span className="inline-flex size-7.5 items-center justify-center rounded-full bg-surface outline-3 outline-lime">
            <Icon name="tune" size={18} className="text-ink" />
          </span>
          sonovarem.app
        </div>
      </Step>
      <Step n={2} text="Turn on “Microphone”">
        <div
          role="img"
          aria-label="Microphone switch turned on"
          className="flex items-center justify-between gap-2 rounded-input bg-sunken px-3 py-2 font-[system-ui] text-[13px] text-ink"
        >
          <span className="inline-flex items-center gap-1.5">
            <Icon name="mic" size={18} />
            Microphone
          </span>
          <span className="box-border flex h-5.5 w-10 justify-end rounded-full bg-[#1a5fb4] p-0.5 outline-3 outline-offset-2 outline-lime">
            <span className="size-4.5 rounded-full bg-white" />
          </span>
        </div>
      </Step>
      <Step n={3} text="Then tap “Try again” below">
        <div
          aria-hidden="true"
          className="flex items-center justify-center rounded-input bg-sunken p-1.5"
        >
          <Icon name="refresh" size={30} className="text-brand" />
        </div>
      </Step>
    </ol>
  )
}

function Step({
  n,
  text,
  children,
}: {
  n: number
  text: string
  children: ReactNode
}) {
  return (
    <li className="flex flex-col gap-3.5 rounded-panel border border-line-subtle bg-surface p-5">
      <span className="flex size-9 items-center justify-center rounded-full bg-brand font-ui text-[17px] font-semibold text-on-brand">
        {n}
      </span>
      {children}
      <span className="text-[17px] leading-snug">{text}</span>
    </li>
  )
}
