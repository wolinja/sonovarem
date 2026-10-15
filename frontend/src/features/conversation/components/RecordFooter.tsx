/**
 * The bottom action bar with the RecordButton (P1-04 §5.7, mockups/J2 footers). One button,
 * one place; its icon, label and action follow the machine phase and whether audio is playing.
 */

import { Icon } from "@/features/shell/Icon"
import { cn } from "@/lib/utils"
import type { Phase } from "../machine/turnMachine"

export type RecordButtonState =
  | "idle"
  | "listening"
  | "processing"
  | "playing"
  | "disabled-offline"

export function recordButtonState(
  phase: Phase,
  playing: boolean,
): RecordButtonState {
  if (phase === "listening") return "listening"
  if (phase === "retry_wait") return "disabled-offline"
  if (playing) return "playing"
  if (
    [
      "uploading",
      "sending",
      "transcribing",
      "thinking",
      "reprompting",
    ].includes(phase)
  ) {
    return "processing"
  }
  return "idle"
}

const COPY: Record<
  RecordButtonState,
  { label: string; aria: string; hint: string; icon: string }
> = {
  idle: {
    label: "Tap to ask",
    aria: "Record your question",
    hint: "Tap the big button and ask your question",
    icon: "mic",
  },
  listening: {
    label: "Tap to stop",
    aria: "Stop recording",
    hint: "",
    icon: "stop",
  },
  processing: {
    label: "Working on your answer",
    aria: "Working on your answer",
    hint: "",
    icon: "hourglass_top",
  },
  playing: {
    label: "Tap to stop audio · tap again to ask",
    aria: "Stop audio",
    hint: "",
    icon: "volume_off",
  },
  "disabled-offline": {
    label: "Waiting for the network",
    aria: "Recording paused, no connection",
    hint: "",
    icon: "mic_off",
  },
}

export function RecordFooter({
  state,
  level = 0,
  idleLabel,
  idleAria,
  showHint,
  onPress,
}: {
  state: RecordButtonState
  level?: number
  /** e.g. "Tap to ask again" after an echo-back */
  idleLabel?: string
  /** e.g. "Answer by voice" during a clarifying question */
  idleAria?: string
  showHint?: boolean
  onPress: () => void
}) {
  const copy = COPY[state]
  const disabled = state === "processing" || state === "disabled-offline"
  const listening = state === "listening"
  return (
    <footer className="sticky bottom-0 z-10 box-border flex flex-none flex-col items-center gap-3 border-t border-line-subtle bg-surface px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pt-6 sm:pb-8">
      {showHint && state === "idle" && (
        <p className="m-0 text-center text-xl font-semibold">{copy.hint}</p>
      )}
      <button
        type="button"
        aria-label={(state === "idle" && idleAria) || copy.aria}
        aria-disabled={disabled || undefined}
        onClick={() => {
          if (!disabled) onPress()
        }}
        className={cn(
          "relative flex items-center justify-center rounded-full p-0",
          listening ? "size-34" : "size-32",
          (state === "idle" || state === "playing") && "bg-lime-tint",
          state === "disabled-offline" && "bg-sunken",
          disabled && "cursor-default",
        )}
      >
        {listening && (
          // The ring grows with the input level; reduced motion keeps it static.
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full border-10 border-lime transition-transform duration-100 motion-reduce:transform-none!"
            style={{ transform: `scale(${1 + Math.min(level, 1) * 0.12})` }}
          />
        )}
        {state === "processing" && (
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-spin rounded-full border-8 border-line-subtle border-t-brand border-r-brand [animation-duration:1.6s]"
          />
        )}
        <span
          className={cn(
            "relative flex items-center justify-center rounded-full",
            state === "idle" && "size-28 bg-lime shadow-record",
            (listening || state === "playing") && "bg-brand",
            listening ? "size-26" : state === "playing" && "size-28",
            state === "processing" && "size-26 bg-sunken",
            state === "disabled-offline" && "size-28 bg-line-subtle",
          )}
        >
          <Icon
            name={copy.icon}
            fill={state !== "processing"}
            size={state === "idle" ? 56 : 52}
            className={cn(
              state === "idle" && "text-on-lime",
              (listening || state === "playing") && "text-on-brand",
              disabled && "text-ink-muted",
            )}
          />
        </span>
      </button>
      <span className="text-center font-ui text-sm font-semibold text-ink-muted">
        {state === "idle" && idleLabel ? idleLabel : copy.label}
      </span>
    </footer>
  )
}
