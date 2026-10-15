/**
 * S11 Operator review view (mockups/J6, P1-04 S11, WP23). A filtered list of turns (low rating,
 * "I don't know", low ASR confidence, mode, dialect, field or live) and a detail pane with the
 * transcript, sources and soil/weather context. Audio plays only where consent layer 3 allows it.
 * A reason tag and note are saved per turn and exported for WP27.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useId, useState } from "react"
import { useApi } from "@/api"
import type {
  AdminTurnDetail,
  AdminTurnFilters,
  AdminTurnSummary,
  Mode,
  TagReason,
  TurnSource,
} from "@/api/contract"
import { PillButton } from "@/features/shell/buttons"
import { Icon } from "@/features/shell/Icon"
import { MODE_OPTIONS, modeTitle } from "@/features/shell/ModeCards"
import { Toast } from "@/features/shell/Toast"
import { cn } from "@/lib/utils"
import { downloadCsv } from "./csv"
import { FieldLabel, TeamError, TeamLayout, teamCard } from "./TeamLayout"
import { useClip } from "./useClip"

export const TAG_REASONS: { value: TagReason; label: string }[] = [
  { value: "asr_misheard", label: "ASR misheard" },
  { value: "retrieval_missed", label: "Retrieval missed" },
  { value: "answer_wrong", label: "Answer wrong" },
  { value: "out_of_scope", label: "Out of scope" },
  { value: "twi_unclear", label: "Spoken Twi unclear" },
]
const reasonLabel = (r: TagReason) =>
  TAG_REASONS.find((t) => t.value === r)?.label ?? r

const DIALECTS = ["Asante Twi", "Akuapem Twi", "Fante"]
const SOURCE_LABEL: Record<TurnSource, string> = {
  field: "Field",
  live: "Live",
}

export function OperatorScreen() {
  const api = useApi()
  const [filters, setFilters] = useState<AdminTurnFilters>({
    low_rating: true,
    idk: true,
  })
  const [selected, setSelected] = useState<string>()
  const [toast, setToast] = useState<string>()
  const hideToast = useCallback(() => setToast(undefined), [])

  const turns = useQuery({
    queryKey: ["admin", "turns", filters],
    queryFn: () => api.admin.turns(filters),
  })
  const rows = turns.data ?? []

  // Keep a selection that is still in the list; otherwise show the first turn.
  useEffect(() => {
    if (!rows.length) return
    if (!selected || !rows.some((r) => r.id === selected))
      setSelected(rows[0].id)
  }, [rows, selected])

  const exportTagged = useMutation({
    mutationFn: () => api.admin.exportTagged(),
    onSuccess: (data) => {
      if (!data.length) {
        setToast("No tagged turns to export yet.")
        return
      }
      downloadCsv(data)
      setToast(
        `Exported ${data.length} tagged ${data.length === 1 ? "turn" : "turns"}.`,
      )
    },
  })

  return (
    <TeamLayout
      headerEnd={
        <PillButton
          icon="download"
          disabled={exportTagged.isPending}
          className="min-h-11 px-4.5 text-sm"
          onClick={() => exportTagged.mutate()}
        >
          Export tagged
        </PillButton>
      }
      toolbar={
        <Filters
          filters={filters}
          count={turns.data?.length}
          onChange={setFilters}
        />
      }
    >
      {turns.isError ? (
        <TeamError error={turns.error} />
      ) : (
        <>
          <section
            aria-label="Turns"
            className="w-full overflow-hidden rounded-panel border border-line-subtle bg-surface lg:max-w-[520px] lg:flex-[1_1_440px]"
          >
            {turns.isLoading && <p className="m-0 p-5">Loading turns…</p>}
            {turns.isSuccess && rows.length === 0 && (
              <p className="m-0 p-5 text-ink-muted">
                No turns match these filters.
              </p>
            )}
            <ul className="m-0 list-none p-0">
              {rows.map((row) => (
                <li key={row.id}>
                  <TurnRow
                    row={row}
                    selected={row.id === selected}
                    onSelect={() => {
                      setSelected(row.id)
                      // One column below 1024 px: bring the detail into view.
                      if (window.matchMedia("(max-width: 1023px)").matches)
                        requestAnimationFrame(() =>
                          document
                            .getElementById("turn-detail")
                            ?.scrollIntoView({ block: "start" }),
                        )
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
          {selected && (
            <TurnDetail
              id={selected}
              onTagged={(label) => setToast(`Tagged: ${label}.`)}
            />
          )}
        </>
      )}
      <Toast
        message={toast}
        onHide={hideToast}
        className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2"
      />
    </TeamLayout>
  )
}

function Filters({
  filters,
  count,
  onChange,
}: {
  filters: AdminTurnFilters
  count?: number
  onChange: (f: AdminTurnFilters) => void
}) {
  const toggle = (
    key: "low_rating" | "idk" | "low_confidence",
    label: string,
    icon?: string,
  ) => {
    const on = !!filters[key]
    return (
      <button
        type="button"
        aria-pressed={on}
        onClick={() => onChange({ ...filters, [key]: !on })}
        className={cn(
          "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5",
          on
            ? "border border-brand-deep bg-highlight text-brand-deep"
            : "border border-line bg-surface text-ink",
        )}
      >
        {icon && <Icon name={icon} fill={icon !== "help"} size={16} />}
        {label}
      </button>
    )
  }
  const select = <T extends string>(
    label: string,
    value: T | undefined,
    options: { value: T; label: string }[],
    set: (v: T | undefined) => void,
    allLabel = "All",
  ) => (
    <label className="relative inline-flex min-h-9 items-center rounded-full border border-line bg-surface pr-3 pl-3.5">
      <span className="sr-only">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => set((e.target.value || undefined) as T | undefined)}
        className="appearance-none bg-transparent pr-5 font-ui text-[13px] font-semibold outline-none"
      >
        <option value="">
          {label}: {allLabel}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {label}: {o.label}
          </option>
        ))}
      </select>
      <Icon
        name="expand_more"
        size={18}
        className="pointer-events-none absolute right-2.5"
      />
    </label>
  )
  return (
    <div
      role="toolbar"
      aria-label="Filters"
      className="flex flex-none flex-wrap items-center gap-2 border-b border-line-subtle bg-surface px-4 py-3.5 font-ui text-[13px] font-semibold lg:px-8"
    >
      <span className="mr-1 text-ink-muted">Show</span>
      {toggle("low_rating", "Rated not helpful", "sentiment_dissatisfied")}
      {toggle("idk", "“I don't know”", "help")}
      {toggle("low_confidence", "Low ASR confidence")}
      {select<Mode>(
        "Mode",
        filters.mode,
        MODE_OPTIONS.map((m) => ({ value: m.mode, label: m.title })),
        (mode) => onChange({ ...filters, mode }),
      )}
      {select(
        "Dialect",
        filters.dialect,
        DIALECTS.map((d) => ({ value: d, label: d })),
        (dialect) => onChange({ ...filters, dialect }),
      )}
      {select<TurnSource>(
        "Source",
        filters.source,
        [
          { value: "field", label: "Field" },
          { value: "live", label: "Live" },
        ],
        (source) => onChange({ ...filters, source }),
        "Field and live",
      )}
      <span role="status" className="ml-auto text-ink-muted">
        {count === undefined
          ? ""
          : `${count} ${count === 1 ? "turn" : "turns"}`}
      </span>
    </div>
  )
}

function OutcomeIcon({ row }: { row: AdminTurnSummary }) {
  if (row.idk)
    return (
      <span
        className="ms flex-none text-[26px] text-ink-muted"
        role="img"
        aria-label="I don't know answer"
      >
        help
      </span>
    )
  const faces = {
    1: ["sentiment_satisfied", "Rated helpful", "text-brand"],
    2: ["sentiment_neutral", "Rated a little helpful", "text-ink-muted"],
    // Problem tones, not the mockup's red (OQ-U11).
    3: ["sentiment_dissatisfied", "Rated not helpful", "text-problem"],
  } as const
  if (!row.rating)
    return (
      <span
        className="ms flex-none text-[26px] text-ink-muted"
        role="img"
        aria-label="Not rated"
      >
        remove
      </span>
    )
  const [icon, label, tone] = faces[row.rating]
  return (
    <span
      className={cn("ms fill flex-none text-[26px]", tone)}
      role="img"
      aria-label={label}
    >
      {icon}
    </span>
  )
}

function TurnRow({
  row,
  selected,
  onSelect,
}: {
  row: AdminTurnSummary
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3.5 border-b border-line-subtle px-5 py-4 text-left text-ink",
        selected
          ? "border-l-4 border-l-brand bg-lime-tint"
          : "bg-surface hover:bg-sunken",
      )}
    >
      <OutcomeIcon row={row} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.75">
        <span className="text-[15px] font-bold">{row.topic}</span>
        <span className="font-ui text-xs text-ink-muted">
          {row.turn_ref} · {modeTitle(row.mode)} · {SOURCE_LABEL[row.source]}
        </span>
      </span>
      <span className="flex flex-col items-end gap-1">
        {row.label && (
          <span
            className={cn(
              "rounded-full px-2 py-0.75 font-ui text-xs font-semibold",
              selected ? "border border-line-subtle bg-surface" : "bg-sunken",
            )}
          >
            {row.label}
          </span>
        )}
        {row.tag && (
          <span className="inline-flex items-center gap-1 font-ui text-xs font-semibold text-brand-deep">
            <Icon name="sell" size={14} />
            {reasonLabel(row.tag.reason)}
          </span>
        )}
      </span>
    </button>
  )
}

function TurnDetail({
  id,
  onTagged,
}: {
  id: string
  onTagged: (label: string) => void
}) {
  const api = useApi()
  const turn = useQuery({
    queryKey: ["admin", "turn", id],
    queryFn: () => api.admin.turn(id),
  })
  const headingId = useId()
  const t = turn.data

  return (
    <section
      id="turn-detail"
      aria-labelledby={headingId}
      className="flex w-full min-w-0 scroll-mt-4 flex-col gap-4 lg:flex-[999_1_560px]"
    >
      {turn.isError && <TeamError error={turn.error} />}
      {t && (
        <>
          <div className={cn(teamCard, "gap-4 p-6")}>
            <div className="flex flex-wrap items-center gap-3">
              <h2 id={headingId} className="m-0 flex-1 text-xl font-bold">
                {t.turn_ref} · {t.topic}
              </h2>
              <AudioStatus turn={t} />
            </div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field
                label={
                  t.transcript_lang === "tw" ? "Twi transcript" : "Transcript"
                }
              >
                <p
                  lang={t.transcript_lang}
                  className="m-0 text-[15px] leading-relaxed"
                >
                  {t.transcript}
                </p>
              </Field>
              {t.pivot_en && (
                <Field label="English pivot">
                  <p className="m-0 text-[15px] leading-relaxed">
                    {t.pivot_en}
                  </p>
                </Field>
              )}
            </div>
            <Field label="Answer">
              <p className="m-0 text-[15px] leading-relaxed">{t.answer_en}</p>
            </Field>
            {t.comment && (
              <Field label="Farmer comment">
                <p className="m-0 text-[15px] leading-relaxed">{t.comment}</p>
              </Field>
            )}
            {t.asr_confidence !== undefined && (
              <FieldLabel>
                ASR confidence {t.asr_confidence.toFixed(2)}
                {t.dialect && ` · ${t.dialect}`}
              </FieldLabel>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ContextCard icon="bookmark" title="Sources">
              {t.citations.length
                ? t.citations.map((c) => (
                    <span key={c.chunk_id}>
                      {c.label_spoken}, {c.date}
                      {c.page && `, p. ${c.page}`}
                    </span>
                  ))
                : "No source cited"}
            </ContextCard>
            <ContextCard icon="water_drop" title="Soil sensor">
              {t.soil ? (
                <>
                  <span>
                    {t.soil.reading} · {t.soil.age}
                  </span>
                  {t.soil.simulated && (
                    <span className="inline-flex items-center gap-1 self-start rounded-full border border-[#496800] bg-lime-tint px-2.5 py-0.75 font-ui text-xs font-semibold text-[#364e00]">
                      <Icon name="science" size={14} />
                      Simulated
                    </span>
                  )}
                </>
              ) : (
                "No reading used"
              )}
            </ContextCard>
            <ContextCard icon="partly_cloudy_day" title="Weather">
              {t.weather?.used
                ? (t.weather.summary ?? "Used in this answer")
                : "Not used in this answer"}
            </ContextCard>
          </div>

          <TagForm turn={t} onTagged={onTagged} />
        </>
      )}
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  )
}

function ContextCard({
  icon,
  title,
  children,
}: {
  icon: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className={cn(teamCard, "gap-2 p-4.5")}>
      <span className="inline-flex items-center gap-1.5 text-[15px] font-bold">
        <Icon name={icon} size={20} className="text-brand" />
        {title}
      </span>
      <div className="flex flex-col gap-2 text-sm leading-normal text-ink-muted">
        {children}
      </div>
    </div>
  )
}

function AudioStatus({ turn }: { turn: AdminTurnDetail }) {
  const clip = useClip(
    turn.audio.status === "kept" ? turn.audio.url : undefined,
    10,
  )
  const muted =
    "inline-flex items-center gap-1.5 font-ui text-[13px] font-semibold text-ink-muted"
  if (turn.audio.status === "typed")
    return (
      <span className={muted}>
        <Icon name="keyboard" size={18} />
        Typed question: no audio
      </span>
    )
  if (turn.audio.status === "not_kept")
    return (
      <span className={muted}>
        <Icon name="mic_off" size={18} />
        Audio not kept: no recordings consent
      </span>
    )
  return (
    <PillButton
      icon={clip.playing ? "pause" : "play_arrow"}
      className="min-h-10 px-4 text-sm"
      onClick={clip.toggle}
    >
      {clip.playing ? "Pause question audio" : "Play question audio"}
    </PillButton>
  )
}

function TagForm({
  turn,
  onTagged,
}: {
  turn: AdminTurnDetail
  onTagged: (label: string) => void
}) {
  const api = useApi()
  const queryClient = useQueryClient()
  const [reason, setReason] = useState<TagReason>(
    turn.tag?.reason ?? "asr_misheard",
  )
  const [note, setNote] = useState(turn.tag?.note ?? "")
  const reasonId = useId()
  const noteId = useId()

  // A different turn starts from its own tag.
  // biome-ignore lint/correctness/useExhaustiveDependencies: turn.id resets the form between untagged turns
  useEffect(() => {
    setReason(turn.tag?.reason ?? "asr_misheard")
    setNote(turn.tag?.note ?? "")
  }, [turn.id, turn.tag])

  const save = useMutation({
    mutationFn: () =>
      api.admin.tagTurn(turn.id, { reason, note: note.trim() || undefined }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] })
      onTagged(reasonLabel(reason))
    },
  })

  return (
    <form
      aria-label="Tag this turn"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
      className={cn(teamCard, "gap-3.5 p-6")}
    >
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-[1_1_220px] flex-col gap-1.5">
          <label htmlFor={reasonId} className="text-[15px] font-bold">
            Reason
          </label>
          <select
            id={reasonId}
            value={reason}
            onChange={(e) => setReason(e.target.value as TagReason)}
            className="min-h-11 rounded-full border border-line bg-surface px-3.5 text-[15px]"
          >
            {TAG_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-[2_1_320px] flex-col gap-1.5">
          <label htmlFor={noteId} className="text-[15px] font-bold">
            Note
          </label>
          <textarea
            id={noteId}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="box-border w-full resize-y rounded-row border border-line px-3.5 py-2.5 text-[15px]"
          />
        </div>
      </div>
      {save.isError && <TeamError error={save.error} />}
      <PillButton
        type="submit"
        variant="primary"
        iconAfter="arrow_forward"
        disabled={save.isPending}
        className="min-h-12 self-start px-5.5 text-[15px]"
      >
        {turn.tag ? "Update tag" : "Save tag"}
      </PillButton>
    </form>
  )
}
