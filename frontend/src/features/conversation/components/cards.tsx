/** Smaller S05 cards: disclaimer, examples, clarify, fallback menu, errors, offers. */

import { Link } from "@tanstack/react-router"
import { useId, useState } from "react"
import type { Lang } from "@/api/contract"
import type { FallbackItem, TurnEventData } from "@/api/events"
import { player } from "@/audio/player"
import { type PromptId, promptText } from "@/audio/prompts"
import { cropScope, type ExampleQuestion } from "@/config/content"
import { PillButton, pillClass } from "@/features/shell/buttons"
import { Icon } from "@/features/shell/Icon"
import { useSecondsUntil } from "@/features/shell/useCountdown"
import { cn } from "@/lib/utils"
import type { ErrorKind } from "../machine/turnMachine"

const cardClass =
  "flex flex-col gap-5 rounded-card border border-line-subtle bg-surface p-6 shadow-card sm:p-8"

/** PR-DIS-01 (mockups/J2 Idle). */
export function DisclaimerCard({ onHear }: { onHear: () => void }) {
  return (
    <div className="flex items-start gap-4 rounded-panel bg-sunken px-6 py-5">
      <Icon name="info" size={26} className="flex-none text-brand" />
      <p className="m-0 flex-1 text-[17px] leading-relaxed text-ink-muted">
        {promptText("PR-DIS-01")}
      </p>
      <button
        type="button"
        aria-label="Hear this"
        onClick={onHear}
        className="inline-flex size-11 flex-none items-center justify-center rounded-full bg-surface text-brand-deep"
      >
        <Icon name="volume_up" size={22} />
      </button>
    </div>
  )
}

/**
 * Voice modes: the first tap on an option plays it, a second tap on the same option sends it.
 * Text mode: one tap sends (P1-04 §5.7 QuickReply).
 */
function useTwoTap<T extends { id: string; text: string }>(
  voice: boolean,
  onSend: (item: T) => void,
) {
  const [armed, setArmed] = useState<string>()
  const tap = (item: T) => {
    if (!voice || armed === item.id) {
      setArmed(undefined)
      player.stop()
      onSend(item)
      return
    }
    setArmed(item.id)
    void player.say(item.text)
  }
  return { armed, tap }
}

function ArmedBadge() {
  return (
    <span className="rounded-full bg-lime px-2.5 py-1 font-ui text-[13px] font-semibold text-on-lime">
      Tap again to send
    </span>
  )
}

/** QuickReply chips: example questions (mockups/J2) and clarify answers (`big`, mockups/J4). */
export function QuickReplies({
  items,
  voice,
  label,
  labelledBy,
  onSend,
  big = false,
}: {
  items: { id: string; text: string; icon?: string }[]
  voice: boolean
  label?: string
  labelledBy?: string
  onSend: (item: { id: string; text: string }) => void
  big?: boolean
}) {
  const { armed, tap } = useTwoTap(voice, onSend)
  return (
    // biome-ignore lint/a11y/useSemanticElements: a labelled group of buttons, not a form fieldset
    <div
      role="group"
      aria-label={label}
      aria-labelledby={labelledBy}
      className="flex flex-wrap gap-3"
    >
      {items.map((item) => {
        const isArmed = armed === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => tap(item)}
            className={cn(
              "inline-flex items-center gap-2.5 rounded-full border bg-surface text-left text-ink",
              big
                ? "min-h-15 px-5.5 text-[19px] font-semibold"
                : "min-h-13 px-5 text-lg",
              isArmed
                ? "border-2 border-brand bg-lime-tint text-brand-deep"
                : "border-line",
            )}
          >
            <Icon
              name={
                isArmed
                  ? "volume_up"
                  : (item.icon ?? (voice ? "volume_up" : "arrow_forward"))
              }
              fill={isArmed}
              size={big ? 24 : 22}
              className={isArmed ? undefined : "text-brand"}
            />
            {item.text}
            {isArmed && <ArmedBadge />}
          </button>
        )
      })}
    </div>
  )
}

/** "What can I ask?" (PR-ASK-02, mockups/J2 Idle). */
export function ExamplesCard({
  examples,
  voice,
  onAsk,
}: {
  examples: ExampleQuestion[]
  voice: boolean
  onAsk: (text: string) => void
}) {
  return (
    <section className={cardClass}>
      <div className="flex items-center gap-4">
        <span className="flex size-14 flex-none items-center justify-center rounded-full bg-lime-tint">
          <Icon name="potted_plant" size={30} className="text-brand" />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-[26px] leading-tight font-bold">
            What can I ask?
          </h1>
          <p className="m-0 text-[17px] text-ink-muted">
            {cropScope.label}.{" "}
            {voice ? "Tap one to hear it." : "Tap one to ask it."}
          </p>
        </div>
      </div>
      <QuickReplies
        label="Example questions"
        voice={voice}
        items={examples}
        onSend={(item) => onAsk(item.text)}
      />
    </section>
  )
}

/** Icons for common clarify answers (mockups/J4 S05b); anything else gets a speech bubble. */
function replyIcon(text: string): string {
  const t = text.toLowerCase()
  if (t.includes("planted") || t.includes("knee")) return "grass"
  if (t.includes("flower")) return "local_florist"
  if (t.includes("not sure")) return "help_outline"
  return "chat_bubble"
}

/** S05b Clarifying question (PR-CLA-01, mockups/J4). */
export function ClarifyCard({
  clarify,
  mode,
  voice,
  onReplay,
  onReply,
}: {
  clarify: TurnEventData["clarify"]
  mode: Lang
  voice: boolean
  onReplay?: () => void
  onReply: (text: string) => void
}) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      aria-live="polite"
      className={cardClass}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 font-ui text-sm font-semibold text-brand">
          <Icon name="contact_support" size={20} />
          {promptText("PR-CLA-01").replace(/\.$/, "")}
        </span>
        {voice && onReplay && (
          <PillButton
            icon="replay"
            className="min-h-11 px-4 text-[15px]"
            onClick={onReplay}
          >
            Hear again
          </PillButton>
        )}
      </div>
      <h1
        id={headingId}
        lang={mode}
        className="m-0 text-[28px] leading-tight font-bold"
      >
        {clarify.text}
      </h1>
      {mode === "tw" && (
        <p className="m-0 text-lg text-ink-muted">{clarify.text_en}</p>
      )}
      {clarify.reason_en && (
        <p className="m-0 text-lg leading-relaxed text-ink-muted">
          {clarify.reason_en}
        </p>
      )}
      <QuickReplies
        big
        labelledBy={headingId}
        voice={voice}
        items={clarify.quick_replies.map((q) => ({
          id: q,
          text: q,
          icon: replyIcon(q),
        }))}
        onSend={(item) => onReply(item.text)}
      />
      {voice && (
        <div
          role="status"
          className="inline-flex items-center gap-2.5 self-start rounded-full bg-sunken px-4 py-2 font-ui text-sm font-semibold text-ink-muted"
        >
          <Icon name="hearing" fill size={18} className="text-brand" />
          Answer by voice, or tap one
        </div>
      )}
    </section>
  )
}

/** S05c Fallback menu after the 2nd failed echo-back (PR-ECH-04, mockups/J4). */
export function FallbackMenu({
  items,
  voice,
  onPick,
  onSpeakAgain,
  onTypeInstead,
  onSwitchLanguage,
}: {
  items: FallbackItem[]
  voice: boolean
  onPick: (item: FallbackItem) => void
  onSpeakAgain?: () => void
  onTypeInstead: () => void
  onSwitchLanguage: () => void
}) {
  const headingId = useId()
  const { armed, tap } = useTwoTap(
    voice,
    (picked: { id: string; text: string }) => {
      const item = items.find((i) => i.id === picked.id)
      if (item) onPick(item)
    },
  )
  return (
    <section aria-labelledby={headingId} className={cardClass}>
      <div className="flex items-start gap-3.5">
        <span className="flex size-13 flex-none items-center justify-center rounded-full bg-lime-tint">
          <Icon name="hearing_disabled" size={28} className="text-brand" />
        </span>
        <div className="flex flex-1 flex-col gap-1">
          <h1
            id={headingId}
            className="m-0 text-[26px] leading-tight font-bold"
          >
            {promptText("PR-ECH-04")}
          </h1>
          <p className="m-0 text-[17px] text-ink-muted">
            {voice
              ? "Tap a question to hear it. Tap again to ask it."
              : "Tap a question to ask it."}
          </p>
        </div>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: a labelled group of buttons */}
      <div
        role="group"
        aria-labelledby={headingId}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {items.map((item) => {
          const isArmed = armed === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => tap({ id: item.id, text: item.label_en })}
              className={cn(
                "flex min-h-24 items-center gap-4 rounded-panel bg-surface px-5 py-4 text-left text-ink",
                isArmed
                  ? "border-2 border-brand bg-lime-tint"
                  : "border border-line",
              )}
            >
              <span className="flex size-14 flex-none items-center justify-center rounded-full bg-lime-tint">
                <Icon
                  name={item.icon ?? "help_outline"}
                  size={30}
                  className="text-brand"
                />
              </span>
              <span className="flex flex-1 flex-col items-start gap-1.5">
                <span className="text-[19px] leading-snug font-semibold">
                  {item.label_en}
                </span>
                {isArmed && <ArmedBadge />}
              </span>
              {voice && (
                <Icon
                  name="volume_up"
                  fill={isArmed}
                  size={24}
                  className="flex-none text-brand"
                />
              )}
            </button>
          )
        })}
      </div>
      <div className="h-px bg-line-subtle" />
      <div className="flex flex-wrap gap-3">
        {voice && onSpeakAgain && (
          <PillButton
            variant="primary"
            size="lg"
            icon="mic"
            onClick={onSpeakAgain}
          >
            Try speaking again
          </PillButton>
        )}
        <PillButton
          size="lg"
          icon="keyboard"
          className="px-5.5"
          onClick={onTypeInstead}
        >
          Type instead
        </PillButton>
        <PillButton
          size="lg"
          icon="swap_horiz"
          className="px-5.5"
          onClick={onSwitchLanguage}
        >
          Change language
        </PillButton>
      </div>
    </section>
  )
}

const ERROR_COPY: Record<
  ErrorKind,
  { prompt: PromptId; icon: string; action: string }
> = {
  upload_failed: { prompt: "PR-ERR-02", icon: "error", action: "Try again" },
  server: { prompt: "PR-ERR-02", icon: "error", action: "Try again" },
  nothing_heard: { prompt: "PR-ERR-03", icon: "mic", action: "Record again" },
  timeout: { prompt: "PR-ERR-05", icon: "schedule", action: "Try again" },
  rate_limited: { prompt: "PR-ERR-06", icon: "schedule", action: "OK" },
}

/** ErrorState (P1-04 §3.3): icon, one sentence, one primary action, never raw error text. */
export function ErrorCard({
  kind,
  onAction,
  onDismiss,
}: {
  kind: ErrorKind
  onAction: () => void
  onDismiss: () => void
}) {
  const copy = ERROR_COPY[kind]
  const retry = kind !== "rate_limited"
  return (
    <section
      role="alert"
      className="flex flex-col gap-4 rounded-card border border-problem/30 bg-problem-bg p-6 sm:p-8"
    >
      <p className="m-0 flex items-start gap-3 text-xl leading-snug font-semibold text-problem">
        <Icon name={copy.icon} size={28} className="flex-none" />
        {promptText(copy.prompt)}
      </p>
      <div className="flex flex-wrap gap-3">
        <PillButton
          variant="primary"
          size="lg"
          onClick={retry ? onAction : onDismiss}
        >
          {copy.action}
        </PillButton>
        {retry && (
          <PillButton variant="ghost" size="lg" onClick={onDismiss}>
            Cancel
          </PillButton>
        )}
      </div>
    </section>
  )
}

/** S05f Offline (RETRY_WAIT, mockups/J3): the question is kept and sent when the network is back. */
export function RetryWaitCard({
  retryAt,
  onHear,
  onTryNow,
  onCancel,
}: {
  retryAt?: number
  onHear: () => void
  onTryNow: () => void
  onCancel: () => void
}) {
  const seconds = useSecondsUntil(retryAt)
  return (
    <section role="alert" className={cardClass}>
      <div className="flex items-center gap-4">
        {/* Problem tones, not the mockup's red (OQ-U11; see README) */}
        <span className="flex size-16 flex-none items-center justify-center rounded-full bg-problem-bg">
          <Icon name="cloud_off" size={34} className="text-problem" />
        </span>
        <h1 className="m-0 flex-1 text-[26px] leading-tight font-bold">
          No connection
        </h1>
        <button
          type="button"
          aria-label="Hear this"
          onClick={onHear}
          className="inline-flex size-12 flex-none items-center justify-center rounded-full bg-sunken text-brand-deep"
        >
          <Icon name="volume_up" size={22} />
        </button>
      </div>
      <p className="m-0 text-[19px] leading-relaxed">
        I kept your question. I will send it when the network is back.
      </p>
      <p className="m-0 flex items-center gap-2.5 font-ui text-[15px] font-semibold text-ink-muted">
        <Icon name="autorenew" size={20} />
        {seconds
          ? `Trying again in ${seconds} ${seconds === 1 ? "second" : "seconds"}`
          : "Trying again now"}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <PillButton
          variant="primary"
          size="xl"
          icon="refresh"
          onClick={onTryNow}
        >
          Try now
        </PillButton>
        <PillButton
          variant="outline-muted"
          size="lg"
          icon="delete"
          onClick={onCancel}
        >
          Cancel question
        </PillButton>
      </div>
    </section>
  )
}

/** S05h Language mismatch (mockups/J4): offer to switch, never switch without asking. */
export function LangOfferCard({
  heardLang,
  onHear,
  onSwitch,
  onStay,
}: {
  heardLang: Lang
  onHear: () => void
  onSwitch: () => void
  onStay: () => void
}) {
  const other = heardLang === "en" ? "English" : "Twi"
  const current = heardLang === "en" ? "Twi" : "English"
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={cardClass}>
      <div className="flex items-center gap-4">
        <span className="flex size-16 flex-none items-center justify-center rounded-full bg-lime-tint">
          <Icon name="translate" size={34} className="text-brand" />
        </span>
        <h1
          id={headingId}
          className="m-0 flex-1 text-[26px] leading-tight font-bold"
        >
          It sounds like you spoke {other}. Do you want to switch?
        </h1>
        <button
          type="button"
          aria-label="Hear this"
          onClick={onHear}
          className="inline-flex size-12 flex-none items-center justify-center rounded-full bg-sunken text-brand-deep"
        >
          <Icon name="volume_up" size={22} />
        </button>
      </div>
      <div className="flex flex-wrap gap-4">
        <button
          type="button"
          onClick={onSwitch}
          className="flex min-h-24 flex-[1_1_260px] items-center gap-4 rounded-panel bg-lime px-6 py-4 text-left text-on-lime"
        >
          <span className="relative flex size-14 flex-none items-center justify-center rounded-full bg-surface">
            <Icon name="mic" size={30} className="text-brand" />
            <span
              aria-hidden="true"
              className="absolute -right-1.5 -bottom-0.5 rounded-full bg-brand-deep px-1.75 py-0.5 font-ui text-[11px] font-semibold text-on-brand"
            >
              {heardLang === "en" ? "EN" : "TW"}
            </span>
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[21px] font-bold">Switch to {other}</span>
            <span className="text-base font-medium">
              Answer this question in {other}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onStay}
          className="flex min-h-24 flex-[1_1_260px] items-center gap-4 rounded-panel border border-line bg-surface px-6 py-4 text-left text-ink"
        >
          <span className="flex size-14 flex-none items-center justify-center rounded-full bg-brand">
            <Icon name="mic" fill size={30} className="text-on-brand" />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[21px] font-bold">Stay in {current}</span>
            <span className="text-base text-ink-muted">
              Ask again in {current}
            </span>
          </span>
        </button>
      </div>
      <p className="m-0 flex items-center gap-2 text-base text-ink-muted">
        <Icon name="info" size={20} />I will never change your language without
        asking.
      </p>
    </section>
  )
}

/** After the first answer: "Save me so I remember you" (S06 entry, P1-04 §2.3). */
export function SavePromptCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <section className={cn(cardClass, "bg-lime-tint")}>
      <div className="flex items-center gap-4">
        <span className="flex size-14 flex-none items-center justify-center rounded-full bg-surface">
          <Icon name="bookmark_add" size={30} className="text-brand" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-2xl font-bold">Save me so I remember you</h2>
          <p className="m-0 text-[17px] text-ink-muted">
            Add your phone number and I will remember your farm next time.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link to="/sign-in" className={pillClass("primary", "lg")}>
          <Icon name="phone_iphone" size={22} />
          Save me
        </Link>
        <PillButton variant="ghost" size="lg" onClick={onDismiss}>
          Not now
        </PillButton>
      </div>
    </section>
  )
}

/** The returning user who lost their session (PR-MEM-05). */
export function SessionLostLink() {
  return (
    <Link to="/sign-in" className={pillClass("outline", "md", "self-start")}>
      <Icon name="person" size={22} />
      I've used this before
    </Link>
  )
}
