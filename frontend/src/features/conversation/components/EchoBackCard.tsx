/**
 * S05a Echo-back confirm (mockups/J2/S05a, P1-04 §5.7). Shows what was heard, with any suggested
 * correction highlighted, and ✓ / ✗. When an implicit yes is allowed, a ring counts it down.
 */

import { useEffect, useState } from "react"
import type { Correction } from "@/api/events"
import { DecisionDisc } from "@/features/shell/buttons"
import { Icon } from "@/features/shell/Icon"
import { clock } from "@/features/shell/useCountdown"
import { cn } from "@/lib/utils"
import type { Question } from "../machine/turnMachine"

function Highlighted({
  text,
  corrections,
}: {
  text: string
  corrections: Correction[]
}) {
  const terms = corrections.map((c) => c.to).filter(Boolean)
  if (terms.length === 0) return <>{text}</>
  const pattern = new RegExp(
    `(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi",
  )
  return (
    <>
      {text.split(pattern).map((part, i) =>
        terms.some((t) => t.toLowerCase() === part.toLowerCase()) ? (
          <mark key={i} className="rounded bg-highlight px-1 text-ink">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  )
}

function useSecondsLeft(deadline?: number) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!deadline) return
    const t = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(t)
  }, [deadline])
  return deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : undefined
}

export function EchoBackCard({
  question,
  awaiting,
  implicitDeadline,
  implicitTotalS,
  onReplay,
  onYes,
  onNo,
}: {
  question: Question
  awaiting: boolean
  implicitDeadline?: number
  implicitTotalS?: number
  onReplay: () => void
  onYes: () => void
  onNo: () => void
}) {
  const secondsLeft = useSecondsLeft(implicitDeadline)
  const progress =
    implicitDeadline && implicitTotalS && secondsLeft !== undefined
      ? 1 - secondsLeft / implicitTotalS
      : 0
  const showEnglish = question.lang === "tw" && question.textEn

  return (
    <section
      aria-labelledby="echo-label"
      className="box-border flex w-full flex-col gap-6 rounded-card border border-line-subtle bg-surface p-6 shadow-card sm:p-9"
    >
      <div className="flex items-center justify-between gap-3">
        <span
          id="echo-label"
          className="font-ui text-[15px] font-semibold text-ink-muted"
        >
          You asked:
        </span>
        <button
          type="button"
          onClick={onReplay}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 font-ui text-[15px] font-semibold text-brand-deep"
        >
          <Icon name="replay" size={20} />
          Hear again
        </button>
      </div>
      <p
        lang={question.lang}
        className="m-0 text-2xl leading-snug font-semibold sm:text-[28px]"
      >
        <Highlighted text={question.text} corrections={question.corrections} />
      </p>
      {showEnglish && (
        <details className="text-[17px] text-ink-muted">
          <summary className="min-h-8 cursor-pointer font-ui text-[15px] font-semibold text-brand-deep">
            Show in English
          </summary>
          <p className="mt-2 mb-0">
            <Highlighted
              text={question.textEn ?? ""}
              corrections={question.corrections}
            />
          </p>
        </details>
      )}
      <div className="h-px bg-line-subtle" />
      <div className="flex flex-col items-center gap-5">
        <p className="m-0 text-[22px] font-semibold">Is that right?</p>
        <div className="flex flex-wrap justify-center gap-10">
          <DecisionDisc
            kind="yes"
            label="Yes"
            size={92}
            aria-label="Yes, that is right"
            disabled={!awaiting}
            onClick={onYes}
            ring={
              <span
                aria-hidden="true"
                className="absolute size-28 rounded-full"
                style={{
                  background: implicitDeadline
                    ? `conic-gradient(var(--color-primary) ${progress * 360}deg, var(--color-border-subtle) 0deg)`
                    : undefined,
                  mask: "radial-gradient(circle, transparent 50px, black 51px)",
                  WebkitMask:
                    "radial-gradient(circle, transparent 50px, black 51px)",
                }}
              />
            }
            className="[&>span:first-child]:size-28"
          />
          <DecisionDisc
            kind="no"
            label="No, ask again"
            size={92}
            aria-label="No, that is wrong"
            disabled={!awaiting}
            onClick={onNo}
            className="[&>span:first-child]:size-28"
          />
        </div>
        <div
          role="status"
          className="inline-flex items-center gap-2.5 rounded-full bg-sunken px-4 py-2 font-ui text-sm font-semibold text-ink-muted"
        >
          <Icon name="hearing" fill size={18} className="text-brand" />
          {secondsLeft !== undefined
            ? `Tap Yes or No. I will continue in ${secondsLeft} seconds.`
            : awaiting
              ? "Tap Yes or No."
              : "Listen to what I heard."}
        </div>
      </div>
    </section>
  )
}

/** The farmer's own message (after confirmation, or typed). */
export function UserBubble({
  question,
  onNotWhatIAsked,
}: {
  question: Question
  onNotWhatIAsked?: () => void
}) {
  return (
    <div className="flex max-w-[520px] flex-col items-end gap-2 self-end">
      <div className="flex flex-col gap-1.5 rounded-[1.5rem_1.5rem_0.5rem_1.5rem] border border-line-subtle bg-lime-tint px-5 py-4">
        <span className="font-ui text-[13px] font-semibold text-ink-muted">
          You
        </span>
        <span
          lang={question.lang}
          className={cn(
            "leading-snug",
            question.lang === "tw" ? "text-xl font-semibold" : "text-[19px]",
          )}
        >
          {question.text}
        </span>
        {question.lang === "tw" && question.textEn && (
          <span className="text-base text-ink-muted">{question.textEn}</span>
        )}
      </div>
      {onNotWhatIAsked && (
        <button
          type="button"
          onClick={onNotWhatIAsked}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-transparent px-3.5 font-ui text-sm font-semibold text-ink-muted hover:bg-sunken"
        >
          <Icon name="close" size={18} />
          That's not what I asked
        </button>
      )}
    </div>
  )
}

/** S05c: the question that was heard wrong twice, struck through (mockups/J4). */
export function RejectedBubble({ question }: { question: Question }) {
  return (
    <div className="flex max-w-[520px] items-center gap-3 self-end rounded-[1.5rem_1.5rem_0.5rem_1.5rem] border border-dashed border-line bg-sunken px-5 py-3.5 text-ink-muted">
      <Icon name="close" size={22} />
      <span className="text-[17px]">
        <s lang={question.lang}>{question.text}</s> · not right
      </span>
    </div>
  )
}

/** S05f: a recorded question kept on this device while offline (mockups/J3). */
export function PendingBubble({
  question,
  durationS,
}: {
  question?: Question
  durationS?: number
}) {
  const time =
    durationS !== undefined && durationS >= 1
      ? ` · ${clock(Math.round(durationS))}`
      : ""
  return (
    <div className="flex max-w-[520px] items-center gap-3.5 self-end rounded-[1.5rem_1.5rem_0.5rem_1.5rem] border border-dashed border-line bg-lime-tint px-5 py-4">
      <Icon name="graphic_eq" fill size={28} className="flex-none text-brand" />
      <span className="flex flex-col gap-0.5">
        <span className="text-lg font-semibold">Your question{time}</span>
        {question && (
          <span lang={question.lang} className="text-[17px] leading-snug">
            {question.text}
          </span>
        )}
        <span className="font-ui text-sm font-medium text-ink-muted">
          Saved on this device, waiting to send
        </span>
      </span>
    </div>
  )
}
