/**
 * S10 Rater scoring view (mockups/J6, P1-04 S10, F-16). Left: audio, transcript, pivot, answer and
 * cited passage. Right: the rubric. Keyboard: 1–5 scores the focused row, R replays the answer,
 * N saves and goes to the next item. A break is suggested at 25 minutes (R13).
 */

import { useMutation, useQuery } from "@tanstack/react-query"
import { useEffect, useId, useRef, useState } from "react"
import { useApi } from "@/api"
import type { Mode, RaterItem, RaterProfile, RaterScores } from "@/api/contract"
import { PillButton } from "@/features/shell/buttons"
import { Icon } from "@/features/shell/Icon"
import { modeTitle } from "@/features/shell/ModeCards"
import { clock } from "@/features/shell/useCountdown"
import { cn } from "@/lib/utils"
import { Chip, FieldLabel, TeamError, TeamLayout, teamCard } from "./TeamLayout"
import { useClip } from "./useClip"

const BREAK_AFTER_MIN = 25

type Criterion = "relevance" | "correctness" | "groundedness" | "intelligible"

const RUBRIC: {
  key: Criterion
  label: string
  hint: string
  anchors: [string, string, string, string, string]
}[] = [
  {
    key: "relevance",
    label: "Relevance",
    hint: "Does it answer what was asked?",
    anchors: [
      "Does not answer the question.",
      "Mostly off the question.",
      "Partly answers it.",
      "Answers it, with a gap.",
      "Answers exactly what was asked.",
    ],
  },
  {
    key: "correctness",
    label: "Correctness",
    hint: "Is the advice right for maize in this area?",
    anchors: [
      "Wrong or unsafe.",
      "Several errors.",
      "Partly correct.",
      "Correct, one minor omission.",
      "Fully correct.",
    ],
  },
  {
    key: "groundedness",
    label: "Groundedness",
    hint: "Is every claim supported by the cited passage?",
    anchors: [
      "Not supported by the passage.",
      "Mostly unsupported.",
      "About half supported.",
      "Supported, one claim is not.",
      "Every claim is supported.",
    ],
  },
  {
    key: "intelligible",
    label: "Spoken Twi is easy to understand",
    hint: "Listen to the answer audio.",
    anchors: [
      "Could not understand it.",
      "Hard to understand.",
      "Understandable with effort.",
      "Clear, a few odd words.",
      "Clear and natural.",
    ],
  },
]

const criteriaFor = (mode: Mode) =>
  RUBRIC.filter((c) => c.key !== "intelligible" || mode === "twi_voice")

const KIND_LABEL = {
  answer: "Answer",
  dose: "Dose answer",
  idk: "I don't know",
}

function useMinutesSince() {
  const [start] = useState(() => Date.now())
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(timer)
  }, [])
  return Math.floor((now - start) / 60_000)
}

export function RaterScreen() {
  const api = useApi()
  const batch = useQuery({
    queryKey: ["admin", "rater-batch"],
    queryFn: () => api.admin.raterBatch(),
    staleTime: Number.POSITIVE_INFINITY,
  })
  const [index, setIndex] = useState(0)
  const [profileSaved, setProfileSaved] = useState(false)
  const [breakDismissed, setBreakDismissed] = useState(false)
  const minutes = useMinutesSince()

  const data = batch.data
  const item = data?.items[index]
  const position = data ? Math.min(data.done + index + 1, data.total) : 0
  const needsProfile = data && !data.profile && !profileSaved

  return (
    <TeamLayout
      headerEnd={
        data && (
          <>
            <span className="font-ui text-sm font-semibold">
              Item {position} of {data.total}
            </span>
            <div
              role="progressbar"
              aria-label="Batch progress"
              aria-valuemin={0}
              aria-valuemax={data.total}
              aria-valuenow={position - 1}
              className="h-1.5 w-45 rounded-full bg-line-subtle"
            >
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${((position - 1) / data.total) * 100}%` }}
              />
            </div>
            <span className="inline-flex items-center gap-1.5 font-ui text-[13px] font-medium text-ink-muted">
              <Icon name="timer" size={18} />
              {minutes} min · break at {BREAK_AFTER_MIN}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line-subtle px-3 py-1.5 font-ui text-[13px] font-semibold">
              <Icon name="badge" size={18} />
              Rater {data.rater_label}
            </span>
          </>
        )
      }
    >
      {batch.isError && <TeamError error={batch.error} />}
      {batch.isLoading && <p className="m-0">Loading the batch…</p>}
      {data && !item && <BatchDone total={data.total} />}
      {item && (
        <>
          <ItemContent item={item} />
          <div className="flex w-full flex-col gap-4 lg:max-w-[480px] lg:flex-[1_1_400px]">
            {minutes >= BREAK_AFTER_MIN && !breakDismissed && (
              <div
                role="status"
                className="flex flex-wrap items-center gap-3 rounded-panel border border-attention-line bg-attention-bg px-5 py-4 text-attention"
              >
                <Icon name="free_breakfast" size={22} />
                <span className="flex-1">
                  You have been scoring for {minutes} minutes. Take a short
                  break.
                </span>
                <PillButton
                  variant="ghost"
                  className="min-h-10 text-sm"
                  onClick={() => setBreakDismissed(true)}
                >
                  Keep going
                </PillButton>
              </div>
            )}
            {needsProfile ? (
              <ProfileForm onSaved={() => setProfileSaved(true)} />
            ) : (
              <Rubric
                key={item.id}
                item={item}
                onNext={() => setIndex((i) => i + 1)}
              />
            )}
          </div>
        </>
      )}
    </TeamLayout>
  )
}

function ItemContent({ item }: { item: RaterItem }) {
  return (
    <section
      aria-label="Item content"
      className="flex min-w-0 flex-col gap-4 lg:flex-[999_1_560px]"
    >
      <div className="flex flex-wrap gap-2.5">
        <Chip>Turn {item.turn_ref}</Chip>
        <Chip>Mode: {modeTitle(item.mode)}</Chip>
        <Chip>Topic: {item.topic}</Chip>
        <Chip tone="highlight">{KIND_LABEL[item.kind]}</Chip>
      </div>

      <AudioCard item={item} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className={cn(teamCard, "gap-2")}>
          <h2 className="m-0 font-ui text-[13px] font-semibold text-ink-muted">
            {item.transcript_lang === "tw"
              ? "Twi transcript (ASR)"
              : "Transcript (ASR)"}
          </h2>
          <p
            lang={item.transcript_lang}
            className="m-0 text-base leading-relaxed"
          >
            {item.transcript}
          </p>
          {item.asr_confidence !== undefined && (
            <span className="font-ui text-xs text-ink-muted">
              ASR confidence {item.asr_confidence.toFixed(2)}
            </span>
          )}
        </div>
        <div className={cn(teamCard, "gap-2")}>
          <h2 className="m-0 font-ui text-[13px] font-semibold text-ink-muted">
            English pivot
          </h2>
          <p className="m-0 text-base leading-relaxed">{item.pivot_en}</p>
        </div>
      </div>

      <div className={cn(teamCard, "gap-2.5")}>
        <h2 className="m-0 font-ui text-[13px] font-semibold text-ink-muted">
          {item.mode === "twi_voice"
            ? "Answer as given (English pivot of spoken Twi)"
            : "Answer as given"}
        </h2>
        <p className="m-0 text-base leading-relaxed">{item.answer_en}</p>
      </div>

      <div className="flex flex-col gap-2.5 rounded-panel bg-sunken p-5">
        <h2 className="m-0 flex items-center gap-2 text-base font-bold">
          <Icon name="bookmark" size={20} className="text-brand" />
          Cited passage
        </h2>
        {item.citations.length === 0 && (
          <p className="m-0 text-[15px] text-ink-muted">
            No source was cited (an “I don't know” answer).
          </p>
        )}
        {item.citations.map((c) => (
          <div key={c.chunk_id} className="flex flex-col gap-2.5">
            <p className="m-0 text-[15px] text-ink-muted">
              {c.label_spoken}, {c.date}
              {c.page && `, p. ${c.page}`}
            </p>
            <blockquote className="m-0 rounded-row bg-surface px-4.5 py-3.5 text-base leading-relaxed">
              {c.passage}
            </blockquote>
          </div>
        ))}
      </div>
    </section>
  )
}

function AudioCard({ item }: { item: RaterItem }) {
  const [rate, setRate] = useState(1)
  const question = useClip(
    item.question_audio_url,
    item.question_duration_s,
    rate,
  )
  const answer = useClip(item.answer_audio_url, item.answer_duration_s, rate)

  // R replays the answer (P1-04 S10 shortcuts).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || e.key.toLowerCase() !== "r") return
      e.preventDefault()
      question.stop()
      answer.replay()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [question, answer])

  if (!item.question_audio_url && !item.answer_audio_url) return null
  return (
    <div className={cn(teamCard, "gap-3.5")}>
      <h2 className="m-0 text-[17px] font-bold">Audio</h2>
      {item.question_audio_url && (
        <ClipRow
          label="Question"
          clip={question}
          onPlay={() => answer.stop()}
        />
      )}
      {item.answer_audio_url && (
        <ClipRow
          label="Answer"
          clip={answer}
          onPlay={() => question.stop()}
          speed={
            // biome-ignore lint/a11y/useSemanticElements: a segmented pair of toggle buttons
            <div
              role="group"
              aria-label="Speed"
              className="flex overflow-hidden rounded-full border border-line font-ui text-[13px] font-semibold"
            >
              {[0.75, 1].map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={rate === r}
                  onClick={() => setRate(r)}
                  className={cn(
                    "min-h-9 px-3",
                    rate === r
                      ? "bg-lime-tint text-brand-deep"
                      : "bg-surface text-ink-muted",
                  )}
                >
                  {r === 1 ? "1.0" : r}×
                </button>
              ))}
            </div>
          }
        />
      )}
    </div>
  )
}

function ClipRow({
  label,
  clip,
  onPlay,
  speed,
}: {
  label: string
  clip: ReturnType<typeof useClip>
  onPlay: () => void
  speed?: React.ReactNode
}) {
  const pct = clip.durationS ? (clip.position / clip.durationS) * 100 : 0
  return (
    <div className="flex flex-wrap items-center gap-3.5">
      <button
        type="button"
        aria-label={`${clip.playing ? "Pause" : "Play"} ${label.toLowerCase()} audio`}
        onClick={() => {
          if (!clip.playing) onPlay()
          clip.toggle()
        }}
        className="inline-flex size-11 flex-none items-center justify-center rounded-full bg-brand text-on-brand"
      >
        <Icon name={clip.playing ? "pause" : "play_arrow"} fill size={26} />
      </button>
      <span className="w-22.5 flex-none font-ui text-[13px] font-semibold">
        {label}
      </span>
      <div
        aria-hidden="true"
        className="h-1.5 min-w-20 flex-1 rounded-full bg-line-subtle"
      >
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-ui text-[13px] text-ink-muted tabular-nums">
        {clock(Math.floor(clip.position))} / {clock(Math.round(clip.durationS))}
      </span>
      {speed}
    </div>
  )
}

const isTyping = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null
  return (
    e.ctrlKey ||
    e.metaKey ||
    e.altKey ||
    !!el?.closest("input, textarea, select, [contenteditable=true]")
  )
}

function Rubric({ item, onNext }: { item: RaterItem; onNext: () => void }) {
  const api = useApi()
  const criteria = criteriaFor(item.mode)
  const [scores, setScores] = useState<Partial<Record<Criterion, number>>>({})
  const [note, setNote] = useState("")
  const [activeRow, setActiveRow] = useState<Criterion>(criteria[0].key)
  const noteId = useId()
  const complete = criteria.every((c) => scores[c.key])

  const save = useMutation({
    mutationFn: () =>
      api.admin.scoreItem(item.id, {
        relevance: scores.relevance,
        correctness: scores.correctness,
        groundedness: scores.groundedness,
        intelligible: scores.intelligible,
        note: note.trim() || undefined,
      } as RaterScores),
    onSuccess: onNext,
  })

  const setScore = (key: Criterion, value: number) => {
    const next = { ...scores, [key]: value }
    setScores(next)
    // Move the keyboard focus row on to the next unscored criterion.
    const nextRow = criteria.find((c) => !next[c.key])
    if (nextRow) setActiveRow(nextRow.key)
  }

  const latest = useRef({ activeRow, complete, save, setScore })
  latest.current = { activeRow, complete, save, setScore }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      const { activeRow, complete, save, setScore } = latest.current
      if (/^[1-5]$/.test(e.key)) {
        e.preventDefault()
        setScore(activeRow, Number(e.key))
      } else if (e.key.toLowerCase() === "n" && complete && !save.isPending) {
        e.preventDefault()
        save.mutate()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <form
      aria-label="Rubric"
      onSubmit={(e) => {
        e.preventDefault()
        if (complete) save.mutate()
      }}
      className="box-border flex flex-col gap-4.5 rounded-panel border border-line-subtle bg-surface p-6"
    >
      <h2 className="m-0 text-xl font-bold">Score this answer</h2>
      {criteria.map((c) => {
        const value = scores[c.key]
        return (
          <fieldset
            key={c.key}
            onFocus={() => setActiveRow(c.key)}
            className={cn(
              "m-0 flex flex-col gap-2 rounded-row border-none p-0",
              activeRow === c.key && "outline-2 outline-offset-6 outline-lime",
            )}
          >
            <legend className="mb-2 p-0 text-[15px] font-bold">
              {c.label}
            </legend>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={value === n}
                  aria-label={`${c.label}: ${n}, ${c.anchors[n - 1]}`}
                  onClick={() => setScore(c.key, n)}
                  className={cn(
                    "min-h-11 flex-1 rounded-full font-ui text-[15px]",
                    value === n
                      ? "border-2 border-brand-deep bg-lime font-bold text-brand-deep"
                      : "border border-line bg-surface font-semibold",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="m-0 text-sm text-ink-muted">
              {value ? `${value}: ${c.anchors[value - 1]}` : c.hint}
            </p>
          </fieldset>
        )
      })}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={noteId} className="text-[15px] font-bold">
          Note (optional)
        </label>
        <textarea
          id={noteId}
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="box-border w-full resize-y rounded-row border border-line px-3.5 py-3 text-[15px]"
        />
      </div>
      {save.isError && <TeamError error={save.error} />}
      <div className="flex flex-wrap items-center gap-3">
        <PillButton
          type="submit"
          variant="primary"
          iconAfter="arrow_forward"
          disabled={!complete || save.isPending}
          className="min-h-13 px-6"
        >
          Save and next
        </PillButton>
        <PillButton
          variant="ghost"
          className="min-h-11 text-sm"
          onClick={onNext}
        >
          Skip item
        </PillButton>
      </div>
      <p className="m-0 flex flex-wrap items-center gap-2.5 text-[13px] text-ink-muted">
        <span>
          <kbd className={kbd}>1</kbd>–<kbd className={kbd}>5</kbd> score
          focused row
        </span>
        <span>
          <kbd className={kbd}>R</kbd> replay
        </span>
        <span>
          <kbd className={kbd}>N</kbd> next
        </span>
      </p>
    </form>
  )
}

const kbd =
  "rounded-[4px] border border-line-input bg-sunken px-1.5 py-0.5 font-ui text-xs font-semibold text-ink"

const DIALECTS = ["Asante Twi", "Akuapem Twi", "Fante", "Other"]
const AGE_BANDS = ["18–29", "30–44", "45–59", "60+"]

/** Asked once per rater, pseudonymously (P1-04 S10). */
function ProfileForm({ onSaved }: { onSaved: () => void }) {
  const api = useApi()
  const [profile, setProfile] = useState<Partial<RaterProfile>>({})
  const save = useMutation({
    mutationFn: () => api.admin.setRaterProfile(profile as RaterProfile),
    onSuccess: onSaved,
  })
  const ready = profile.dialect && profile.age_band
  const choice = (
    key: keyof RaterProfile,
    label: string,
    options: string[],
  ) => (
    <fieldset className="m-0 flex flex-col gap-2 border-none p-0">
      <legend className="mb-2 p-0 text-[15px] font-bold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={profile[key] === o}
            onClick={() => setProfile((p) => ({ ...p, [key]: o }))}
            className={cn(
              "min-h-11 rounded-full px-4 font-ui text-[15px] font-semibold",
              profile[key] === o
                ? "border-2 border-brand-deep bg-lime text-brand-deep"
                : "border border-line bg-surface",
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  )
  return (
    <form
      aria-label="About you"
      onSubmit={(e) => {
        e.preventDefault()
        if (ready) save.mutate()
      }}
      className="flex flex-col gap-4.5 rounded-panel border border-line-subtle bg-surface p-6"
    >
      <h2 className="m-0 text-xl font-bold">Before you start</h2>
      <p className="m-0 text-[15px] text-ink-muted">
        We ask this once. It is stored with your rater number only, not your
        name, so scores can be compared across dialects and ages.
      </p>
      {choice("dialect", "Your Twi dialect", DIALECTS)}
      {choice("age_band", "Your age", AGE_BANDS)}
      {save.isError && <TeamError error={save.error} />}
      <PillButton
        type="submit"
        variant="primary"
        iconAfter="arrow_forward"
        disabled={!ready || save.isPending}
        className="min-h-13 self-start px-6"
      >
        Start scoring
      </PillButton>
    </form>
  )
}

function BatchDone({ total }: { total: number }) {
  return (
    <section
      className={cn(
        teamCard,
        "mx-auto max-w-[560px] items-center gap-4 p-8 text-center",
      )}
    >
      <Icon name="task_alt" size={48} className="text-brand" />
      <h2 className="m-0 text-2xl font-bold">Batch done</h2>
      <p className="m-0 text-ink-muted">
        All {total} items are scored. Thank you. You can close this page.
      </p>
      <FieldLabel>Skipped items come back in your next batch.</FieldLabel>
    </section>
  )
}
