/**
 * The three mode cards, shared by S02 and the S05g mode switcher. Tapping a card chooses it; the
 * speaker button only says the card's name, in that card's own language (PR-MOD-01a/b/c).
 */

import type { Mode } from "@/api/contract"
import { player } from "@/audio/player"
import type { PromptId } from "@/audio/prompts"
import { cn } from "@/lib/utils"
import { Icon } from "./Icon"

export interface ModeOption {
  mode: Mode
  title: string
  subtitle: string
  labelPrompt: PromptId
  labelLang: "tw" | "en"
}

export const MODE_OPTIONS: ModeOption[] = [
  {
    mode: "twi_voice",
    title: "Speak Twi",
    subtitle: "Ask and hear answers in Twi",
    labelPrompt: "PR-MOD-01a",
    labelLang: "tw",
  },
  {
    mode: "english_voice",
    title: "Speak English",
    subtitle: "Ask and hear answers in English",
    labelPrompt: "PR-MOD-01b",
    labelLang: "en",
  },
  {
    mode: "english_text",
    title: "Read English",
    subtitle: "Type and read. No microphone needed",
    labelPrompt: "PR-MOD-01c",
    labelLang: "en",
  },
]

export const modeTitle = (mode: Mode) =>
  MODE_OPTIONS.find((o) => o.mode === mode)?.title ?? mode

const ICON_SIZE = {
  sm: { disc: "size-16", glyph: 34 },
  md: { disc: "size-18", glyph: 38 },
  lg: { disc: "size-23", glyph: 48 },
}

/** Twi voice is brand-filled at S02 (the primary mode); elsewhere icons sit on lime tint. */
export function ModeIcon({
  mode,
  large = false,
  size = large ? "lg" : "md",
}: {
  mode: Mode
  large?: boolean
  size?: keyof typeof ICON_SIZE
}) {
  const { disc, glyph } = ICON_SIZE[size]
  if (mode === "twi_voice" && size !== "sm") {
    return (
      <span
        className={cn(
          "flex flex-none items-center justify-center rounded-full bg-brand",
          disc,
        )}
      >
        <Icon name="mic" fill size={glyph} className="text-on-brand" />
      </span>
    )
  }
  return (
    <span
      className={cn(
        "relative flex flex-none items-center justify-center rounded-full bg-lime-tint",
        disc,
      )}
    >
      <Icon
        name={mode === "english_text" ? "menu_book" : "mic"}
        size={glyph}
        className="text-brand"
      />
      {mode === "english_voice" && (
        <span
          aria-hidden="true"
          className="absolute -right-1.5 -bottom-0.5 rounded-full bg-brand-deep px-2 py-0.5 font-ui text-xs font-semibold text-on-brand"
        >
          EN
        </span>
      )}
    </span>
  )
}

export function ModeCards({
  onChoose,
  current,
}: {
  onChoose: (mode: Mode) => void
  current?: Mode | null
}) {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {MODE_OPTIONS.map((option) => {
        const twi = option.mode === "twi_voice"
        const selected = current === option.mode
        return (
          <div
            key={option.mode}
            className={cn(
              "relative flex items-center rounded-card bg-surface shadow-card",
              twi || selected
                ? "border-2 border-brand shadow-card-strong"
                : "border border-line-subtle",
            )}
          >
            <button
              type="button"
              onClick={() => {
                void player.playPrompt(option.labelPrompt, option.labelLang)
                onChoose(option.mode)
              }}
              aria-current={selected ? "true" : undefined}
              className={cn(
                "flex flex-1 items-center gap-4 rounded-card bg-transparent py-5 pr-20 pl-5 text-left text-ink sm:gap-6 sm:pl-7",
                twi ? "min-h-35 sm:py-6" : "min-h-27",
              )}
            >
              <ModeIcon mode={option.mode} large={twi} />
              <span className="flex flex-1 flex-col gap-1">
                <span
                  className={cn(
                    "leading-tight font-bold",
                    twi ? "text-[26px] sm:text-[30px]" : "text-2xl",
                  )}
                >
                  {option.title}
                </span>
                <span className="text-lg text-ink-muted">
                  {option.subtitle}
                </span>
              </span>
            </button>
            <button
              type="button"
              aria-label={`Hear “${option.title}”`}
              onClick={() =>
                void player.playPrompt(option.labelPrompt, option.labelLang)
              }
              className="absolute right-3 flex size-14 items-center justify-center rounded-full bg-transparent text-brand hover:bg-lime-tint sm:right-5"
            >
              <Icon name="volume_up" size={28} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
