/**
 * AnswerCard (P1-04 §5.7). Key action first; the full answer and its source on screen (UP8).
 * Twi answers follow mockups/J2 Answer; English answers follow mockups/J3 S05-Text (dose quote,
 * safety note, "Why" points, Source details). Variants: answer, dose (G-DOSE), idk.
 */

import { type ReactNode, useId, useState } from "react"
import type { Lang } from "@/api/contract"
import type { Citation, TurnEventData } from "@/api/events"
import { promptText } from "@/audio/prompts"
import { Icon } from "@/features/shell/Icon"
import { cn } from "@/lib/utils"
import type { QueuedClip, Sentence } from "../machine/turnMachine"
import type { Rendition } from "../machine/useTurnDriver"

const actionClass =
  "inline-flex min-h-13 items-center gap-2 rounded-full border-none bg-lime-tint px-5 font-ui text-base font-semibold text-brand-deep disabled:opacity-50"

/** "Publisher guide, [YEAR], p. [PAGE]" (mockups/J3). */
export function citationLine(citation: Citation) {
  const page = citation.page ? `, p. ${citation.page}` : ""
  return `${citation.label_spoken}, ${citation.date}${page}`
}

function CitationDetails({
  citation,
  id,
}: {
  citation: Citation
  id?: string
}) {
  return (
    <div
      id={id}
      className="flex flex-col gap-1.5 rounded-row border border-line-subtle bg-sunken px-5 py-4 text-base"
    >
      <span className="font-semibold">{citation.title}</span>
      <span className="text-ink-muted">
        {citation.publisher} · {citation.date}
        {citation.page && ` · p. ${citation.page}`}
      </span>
      <blockquote className="m-0 mt-1 border-l-4 border-brand pl-3 text-ink">
        {citation.passage}
      </blockquote>
      {citation.url && (
        <a
          href={citation.url}
          target="_blank"
          rel="noreferrer"
          className="font-semibold"
        >
          Open the source
        </a>
      )}
    </div>
  )
}

export function CitationChip({ citation }: { citation: Citation }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className="flex flex-col gap-2 self-start">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-12 items-center gap-2.5 self-start rounded-full border border-line bg-surface py-0 pr-4.5 pl-3 text-left text-base font-semibold text-ink"
      >
        <Icon name="bookmark" size={22} className="text-brand" />
        From: {citation.publisher.replace(/\s*\(.*\)$/, "")}{" "}
        {citation.title.toLowerCase()}, {citation.date}
        <Icon name={open ? "expand_less" : "expand_more"} size={22} />
      </button>
      {open && <CitationDetails id={id} citation={citation} />}
    </div>
  )
}

function byLang(sentences: Sentence[], lang: Lang) {
  return sentences.filter((s) => s.lang === lang)
}

export function AnswerCard({
  sentences,
  citations,
  notices,
  idk,
  spokenLang,
  voice,
  clips,
  clipsLeft,
  playing,
  audioFailed,
  streaming,
  interrupted,
  answerId,
  rendition,
  onReplay,
  onRetryAudio,
  onHearTwi,
  footer,
}: {
  sentences: Sentence[]
  citations: Citation[]
  notices: TurnEventData["notice"][]
  idk?: TurnEventData["idk"]
  spokenLang: Lang
  voice: boolean
  clips: QueuedClip[]
  /** Clips not yet played (active turn only). */
  clipsLeft?: number
  playing?: boolean
  audioFailed?: boolean
  streaming?: boolean
  interrupted?: boolean
  answerId?: string
  rendition?: Rendition
  onReplay?: (clips: QueuedClip[]) => void
  onRetryAudio?: () => void
  onHearTwi?: (answerId: string) => void
  /** Below a divider inside the card: the inline rating in text mode (mockups/J3). */
  footer?: ReactNode
}) {
  const headingId = useId()
  const sourceId = useId()
  const [sourceOpen, setSourceOpen] = useState(false)
  const english = byLang(sentences, "en")
  const twi = byLang(sentences, "tw")
  const showTwiFirst = spokenLang === "tw" && twi.length > 0
  const primary = showTwiFirst ? twi : english
  const [key, ...points] = primary
  const [detailsOpen, setDetailsOpen] = useState(true)
  const total = clips.length
  const played = clipsLeft !== undefined ? total - clipsLeft : total

  if (idk) return <IdkCard idk={idk} />

  return (
    <article
      aria-labelledby={headingId}
      aria-busy={streaming || undefined}
      className="flex flex-col gap-5 rounded-card border border-line-subtle bg-surface p-6 shadow-card sm:p-8"
    >
      {voice && total > 0 && playing && clipsLeft !== undefined && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 font-ui text-sm font-semibold text-brand">
            <Icon name="graphic_eq" fill size={20} />
            Playing · part {Math.min(played + 1, total)} of {total}
          </span>
          <div
            aria-hidden="true"
            className="h-1.5 max-w-65 min-w-40 flex-1 overflow-hidden rounded-full bg-line-subtle"
          >
            <div
              className="h-full rounded-full bg-brand transition-[width]"
              style={{ width: `${(played / total) * 100}%` }}
            />
          </div>
        </div>
      )}
      {interrupted && (
        <span className="inline-flex items-center gap-2 self-start rounded-full bg-sunken px-3 py-1 font-ui text-sm font-semibold text-ink-muted">
          <Icon name="block" size={18} />
          Stopped early
        </span>
      )}

      <h2
        id={headingId}
        lang={showTwiFirst ? "tw" : "en"}
        className={cn(
          "m-0 leading-snug font-bold",
          showTwiFirst ? "text-[26px]" : "text-2xl",
        )}
      >
        {key?.text ?? (
          <span className="block h-8 w-3/4 animate-pulse rounded-row bg-sunken" />
        )}
      </h2>

      {showTwiFirst ? (
        <details
          open={detailsOpen}
          onToggle={(e) => setDetailsOpen(e.currentTarget.open)}
          className="rounded-panel bg-sunken px-5 py-4"
        >
          <summary className="min-h-8 cursor-pointer font-ui text-[15px] font-semibold text-brand-deep">
            Show in English
          </summary>
          <SentenceList sentences={english} citation={citations[0]} />
        </details>
      ) : (
        <EnglishBody sentences={points} citation={citations[0]} />
      )}

      {streaming && (
        <span
          className="block h-5 w-2/3 animate-pulse rounded-row bg-sunken"
          aria-hidden="true"
        />
      )}

      {notices
        .filter((n) => n.kind !== "chemical_disclaimer")
        .map((n) => (
          <span
            key={n.kind}
            className="inline-flex items-center gap-2 self-start rounded-full border border-attention-line bg-attention-bg px-3 py-1 text-attention"
          >
            <Icon name="science" size={18} />
            {n.kind === "simulated_soil" ? "Simulated" : "Note"}
          </span>
        ))}

      {showTwiFirst &&
        citations.map((c) => <CitationChip key={c.chunk_id} citation={c} />)}

      {audioFailed && voice && (
        <p
          role="status"
          className="m-0 flex items-center gap-2 rounded-row bg-problem-bg px-4 py-3 text-problem"
        >
          <Icon name="volume_off" size={22} />
          {promptText("PR-ERR-04")}
        </p>
      )}

      {rendition && rendition.sentences.length > 0 && (
        <div lang="tw" className="rounded-panel bg-lime-tint px-5 py-4">
          <span className="font-ui text-sm font-semibold text-brand-deep">
            In Twi
          </span>
          {rendition.sentences.map((s) => (
            <p key={s.seq} className="m-0 mt-1 text-lg">
              {s.text}
            </p>
          ))}
        </div>
      )}

      {!streaming && (
        <div className="flex flex-wrap gap-3 pt-1">
          {voice && onReplay && clips.length > 0 && !audioFailed && (
            <button
              type="button"
              className={actionClass}
              onClick={() => onReplay(clips)}
            >
              <Icon name="replay" size={22} />
              Hear again
            </button>
          )}
          {voice && audioFailed && onRetryAudio && (
            <button
              type="button"
              className={actionClass}
              onClick={onRetryAudio}
            >
              <Icon name="refresh" size={22} />
              Try the sound again
            </button>
          )}
          {showTwiFirst && (
            <button
              type="button"
              className={actionClass}
              onClick={() => setDetailsOpen((o) => !o)}
            >
              <Icon name="subject" size={22} />
              {detailsOpen ? "Hide full answer" : "Full answer"}
            </button>
          )}
          {spokenLang === "en" && answerId && onHearTwi && (
            <button
              type="button"
              className={cn(actionClass, "bg-lime")}
              disabled={rendition?.status === "loading"}
              onClick={() => onHearTwi(answerId)}
            >
              <Icon name="volume_up" size={22} />
              {rendition?.status === "loading"
                ? "Preparing Twi…"
                : "Hear in Twi"}
            </button>
          )}
          {!showTwiFirst && citations.length > 0 && (
            <button
              type="button"
              aria-expanded={sourceOpen}
              aria-controls={sourceId}
              onClick={() => setSourceOpen((o) => !o)}
              className="inline-flex min-h-13 items-center gap-2 rounded-full border border-line bg-surface px-5 font-ui text-base font-semibold text-brand-deep"
            >
              <Icon name="bookmark" size={22} />
              Source details
              <Icon
                name={sourceOpen ? "expand_less" : "expand_more"}
                size={22}
              />
            </button>
          )}
        </div>
      )}

      {!showTwiFirst && sourceOpen && (
        <div id={sourceId} className="flex flex-col gap-3">
          {citations.map((c) => (
            <CitationDetails key={c.chunk_id} citation={c} />
          ))}
        </div>
      )}

      {footer && (
        <>
          <div className="h-px bg-line-subtle" />
          {footer}
        </>
      )}
    </article>
  )
}

function SentenceList({
  sentences,
  citation,
}: {
  sentences: Sentence[]
  citation?: Citation
}) {
  if (sentences.length === 0) return null
  const [first, ...rest] = sentences
  const advice = rest.filter((s) => s.kind !== "dose" && s.kind !== "safety")
  const doses = rest.filter((s) => s.kind === "dose")
  const safety = sentences.filter((s) => s.kind === "safety")
  return (
    <div className="flex flex-col gap-3 pt-2">
      {first && first.kind !== "safety" && (
        <p className="m-0 text-[22px] leading-snug font-semibold">
          {first.text}
        </p>
      )}
      {advice.length > 0 && (
        <ol className="m-0 flex flex-col gap-2 pl-6 text-lg leading-relaxed">
          {advice.map((s) => (
            <li key={s.seq}>{s.text}</li>
          ))}
        </ol>
      )}
      {doses.map((s) => (
        // G-DOSE: the dose is quoted verbatim, with its source, never paraphrased.
        <figure
          key={s.seq}
          className="m-0 flex flex-col gap-2 rounded-row border-l-4 border-brand bg-surface px-4 py-3"
        >
          <blockquote className="m-0 text-lg font-semibold">
            {s.text}
          </blockquote>
          {citation && (
            <figcaption className="text-base text-ink-muted">
              Word for word from: {citation.title}, {citation.publisher},{" "}
              {citation.date}
            </figcaption>
          )}
        </figure>
      ))}
      {safety.map((s) => (
        <p
          key={s.seq}
          className="m-0 flex items-start gap-2 rounded-row border border-attention-line bg-attention-bg px-4 py-3 text-lg text-attention"
        >
          <Icon name="health_and_safety" size={24} />
          {s.text}
        </p>
      ))}
    </div>
  )
}

/** English answer body (mockups/J3): the dose quote, the safety note, then "Why". */
function EnglishBody({
  sentences,
  citation,
}: {
  sentences: Sentence[]
  citation?: Citation
}) {
  const doses = sentences.filter((s) => s.kind === "dose")
  const safety = sentences.filter((s) => s.kind === "safety")
  const points = sentences.filter(
    (s) => s.kind !== "dose" && s.kind !== "safety",
  )
  return (
    <>
      {doses.map((s) => (
        // G-DOSE: the dose is quoted verbatim, with its source, never paraphrased.
        <blockquote
          key={s.seq}
          cite={citation?.label_spoken}
          className="m-0 flex flex-col gap-2.5 rounded-panel bg-sunken px-6 py-5"
        >
          <span className="font-ui text-[13px] font-semibold text-ink-muted">
            The guide says, word for word:
          </span>
          <p className="m-0 text-xl leading-snug font-semibold">“{s.text}”</p>
          {citation && (
            <span className="text-base text-ink-muted">
              {citationLine(citation)}
            </span>
          )}
        </blockquote>
      ))}
      {safety.map((s) => (
        <div
          key={s.seq}
          role="note"
          className="flex items-start gap-3.5 rounded-panel border-2 border-brand bg-surface px-5 py-4"
        >
          <Icon
            name="health_and_safety"
            size={26}
            className="flex-none text-brand"
          />
          <p className="m-0 text-[17px] leading-relaxed">{s.text}</p>
        </div>
      ))}
      {points.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h3 className="m-0 text-lg font-bold">Why</h3>
          <ul className="m-0 flex list-disc flex-col gap-2 pl-5.5 text-lg leading-relaxed">
            {points.map((s) => (
              <li key={s.seq}>{s.text}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

function IdkCard({ idk }: { idk: TurnEventData["idk"] }) {
  return (
    <article className="flex flex-col gap-4 rounded-card border border-line-subtle bg-surface p-6 shadow-card sm:p-8">
      <h2 className="m-0 flex items-center gap-3 text-2xl leading-snug font-bold">
        <Icon name="help" size={28} className="text-brand" />I don't have
        reliable information on this.
      </h2>
      <p className="m-0 text-lg text-ink-muted">
        I can help with: {idk.can_help_with.join(", ")}.
      </p>
      <div className="flex flex-col gap-2 rounded-panel bg-sunken px-5 py-4">
        <span className="font-ui text-sm font-semibold text-ink-muted">
          What you could do
        </span>
        <ul className="m-0 flex flex-col gap-1.5 pl-5 text-lg">
          {idk.next_steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </div>
    </article>
  )
}
