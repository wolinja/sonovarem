/**
 * S05d Rating (mockups/J2, P1-04 §5.7 RatingFaces): about the advice, three faces, never blocks
 * the next question. After a face: thanks, an optional comment, Done.
 */

import { useId } from "react"
import type { RatingFace } from "@/api/contract"
import { promptText } from "@/audio/prompts"
import { PillButton } from "@/features/shell/buttons"
import { Icon } from "@/features/shell/Icon"
import { cn } from "@/lib/utils"

export const RATING_FACES: {
  face: RatingFace
  label: string
  icon: string
  disc: string
  glyph: string
}[] = [
  {
    face: 1,
    label: "It helped",
    icon: "sentiment_satisfied",
    disc: "bg-lime-tint",
    glyph: "text-brand",
  },
  {
    face: 2,
    label: "A little",
    icon: "sentiment_neutral",
    disc: "bg-sunken",
    glyph: "text-neutral-face",
  },
  // Burnt orange, not red: red is associated with mourning (P1-04 §5.2, OQ-U11).
  {
    face: 3,
    label: "It did not",
    icon: "sentiment_dissatisfied",
    disc: "bg-problem-bg",
    glyph: "text-problem",
  },
]

export function RatingCard({
  selected,
  onRate,
  onSkip,
  onDone,
  onComment,
  onHear,
}: {
  selected?: RatingFace
  onRate: (face: RatingFace) => void
  onSkip: () => void
  onDone: () => void
  onComment: (text: string) => void
  onHear: () => void
}) {
  const headingId = useId()
  return (
    <section className="flex flex-col items-center gap-5 rounded-card border border-line-subtle bg-surface px-6 py-7 sm:px-8">
      <h2
        id={headingId}
        className="m-0 flex items-center gap-2.5 text-[22px] font-bold"
      >
        {promptText("PR-RAT-01")}
        <button
          type="button"
          aria-label="Hear this"
          onClick={onHear}
          className="inline-flex size-10 items-center justify-center rounded-full bg-sunken text-brand-deep"
        >
          <Icon name="volume_up" size={22} />
        </button>
      </h2>
      <div
        role="radiogroup"
        aria-labelledby={headingId}
        className="flex flex-wrap justify-center gap-8"
      >
        {RATING_FACES.map((f) => {
          const isSelected = selected === f.face
          return (
            // biome-ignore lint/a11y/useSemanticElements: a large tappable face, with radio semantics
            <button
              key={f.face}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onRate(f.face)}
              className={cn(
                "flex flex-col items-center gap-2 bg-transparent text-ink",
                selected && !isSelected && "opacity-50",
              )}
            >
              <span
                className={cn(
                  "flex size-21 items-center justify-center rounded-full transition-transform",
                  f.disc,
                  isSelected && "scale-110 ring-4 ring-brand ring-offset-2",
                )}
              >
                <Icon name={f.icon} fill size={56} className={f.glyph} />
              </span>
              <span className="text-[17px] font-semibold">{f.label}</span>
            </button>
          )
        })}
      </div>
      {selected ? (
        <AfterRating onDone={onDone} onComment={onComment} />
      ) : (
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex min-h-11 items-center bg-transparent font-ui text-[15px] font-semibold text-brand-deep"
        >
          Skip
        </button>
      )}
    </section>
  )
}

/** Thanks, an optional comment and Done, after a face is chosen. */
function AfterRating({
  onDone,
  onComment,
}: {
  onDone: () => void
  onComment: (text: string) => void
}) {
  const commentId = useId()
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <p role="status" className="m-0 text-lg">
        {promptText("PR-RAT-02")}
      </p>
      <label
        htmlFor={commentId}
        className="font-ui text-sm font-semibold text-ink-muted"
      >
        Anything to add? (optional)
      </label>
      <textarea
        id={commentId}
        rows={2}
        onChange={(e) => onComment(e.target.value)}
        className="rounded-input border border-line bg-surface px-4 py-3 text-lg"
      />
      <PillButton variant="primary" size="lg" onClick={onDone}>
        Done
      </PillButton>
    </div>
  )
}

/** Text mode (mockups/J3 S05-Text): the faces sit on one row inside the answer card. */
export function InlineRating({
  selected,
  onRate,
  onDone,
  onComment,
}: {
  selected?: RatingFace
  onRate: (face: RatingFace) => void
  onDone: () => void
  onComment: (text: string) => void
}) {
  const labelId = useId()
  return (
    <div className="flex flex-col gap-4">
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="flex flex-wrap items-center gap-4"
      >
        <span id={labelId} className="mr-2 text-lg font-semibold">
          {promptText("PR-RAT-01")}
        </span>
        {RATING_FACES.map((f) => {
          const isSelected = selected === f.face
          return (
            // biome-ignore lint/a11y/useSemanticElements: a large tappable face, with radio semantics
            <button
              key={f.face}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={f.label}
              onClick={() => onRate(f.face)}
              className={cn(
                "inline-flex size-14 items-center justify-center rounded-full",
                f.disc,
                isSelected && "ring-4 ring-brand ring-offset-2",
                selected && !isSelected && "opacity-50",
              )}
            >
              <Icon name={f.icon} fill size={36} className={f.glyph} />
            </button>
          )
        })}
      </div>
      {selected && <AfterRating onDone={onDone} onComment={onComment} />}
    </div>
  )
}
