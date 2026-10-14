/** S05 Listening (mockups/J2): live level, elapsed time, Cancel. Reduced motion: static bars + timer. */

import { useEffect, useState } from "react"
import { pillClass } from "@/features/shell/buttons"
import { Icon } from "@/features/shell/Icon"

const BARS = 15

export function ListeningPanel({
  level,
  onCancel,
}: {
  level: number
  onCancel: () => void
}) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const t = setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      250,
    )
    return () => clearInterval(t)
  }, [])
  const mm = Math.floor(elapsed / 60)
  const ss = String(elapsed % 60).padStart(2, "0")

  return (
    <div className="flex flex-col items-center gap-7 py-6 text-center">
      {/* Only the label is live: the ticking timer must not be announced every second. */}
      <div
        role="status"
        className="inline-flex items-center gap-2.5 rounded-full bg-lime-tint px-4.5 py-2 font-ui text-[15px] font-semibold text-brand-deep"
      >
        <span className="size-2.5 animate-pulse rounded-full bg-brand" />
        Listening
      </div>
      <h1 className="m-0 text-3xl leading-tight font-bold sm:text-[34px]">
        I am listening. Speak now.
      </h1>
      <div aria-hidden="true" className="flex h-24 items-center gap-2">
        {Array.from({ length: BARS }, (_, i) => {
          // A gentle arch so the middle bars move most.
          const weight = 1 - Math.abs(i - (BARS - 1) / 2) / BARS
          const h = 20 + Math.min(1, level) * 64 * weight
          return (
            <span
              key={i}
              className="w-2 rounded-full bg-brand transition-[height] duration-75"
              style={{ height: h }}
            />
          )
        })}
      </div>
      <div
        aria-hidden="true"
        className="font-ui text-2xl font-semibold tabular-nums"
      >
        {mm}:{ss}
      </div>
      <p className="m-0 max-w-md text-lg text-ink-muted">
        Tap stop when you finish. If you go quiet, I will stop by myself.
      </p>
      <button
        type="button"
        onClick={onCancel}
        className={pillClass("outline-muted", "lg")}
      >
        <Icon name="close" size={22} />
        Cancel
      </button>
    </div>
  )
}
