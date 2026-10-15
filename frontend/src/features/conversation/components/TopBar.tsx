/**
 * S05 top bar (mockups/J2): ModeSwitcher chip left, name centre, Help and Settings right. These
 * controls never move between screens (UP3).
 */

import { Link, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { useApi } from "@/api"
import type { Mode } from "@/api/contract"
import { player } from "@/audio/player"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { CircleButton } from "@/features/shell/buttons"
import { HelpButton } from "@/features/shell/HelpButton"
import { Icon } from "@/features/shell/Icon"
import { MODE_OPTIONS, ModeIcon, modeTitle } from "@/features/shell/ModeCards"
import { isVoiceMode, session } from "@/session/store"

export function TopBar({
  mode,
  modeSheetOpen,
  onModeSheetChange,
}: {
  mode: Mode
  modeSheetOpen?: boolean
  onModeSheetChange?: (open: boolean) => void
}) {
  const [localOpen, setLocalOpen] = useState(false)
  const open = modeSheetOpen ?? localOpen
  const setOpen = onModeSheetChange ?? setLocalOpen
  return (
    <header className="sticky top-0 z-10 box-border flex min-h-18 flex-none flex-wrap items-center justify-between gap-3 border-b border-line-subtle bg-surface px-4 py-3 sm:px-8">
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          if (isVoiceMode(mode))
            void player.playPrompt(
              "PR-MOD-03",
              mode === "twi_voice" ? "tw" : "en",
            )
        }}
        aria-label={`Change language and mode, current: ${modeTitle(mode)}`}
        className="inline-flex min-h-12 items-center gap-2.5 rounded-full border border-line-subtle bg-lime-tint py-0 pr-4 pl-2 font-ui text-base font-semibold text-brand-deep"
      >
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-brand">
          <Icon
            name={mode === "english_text" ? "menu_book" : "mic"}
            fill={mode !== "english_text"}
            size={20}
            className="text-on-brand"
          />
        </span>
        {modeTitle(mode)}
        <Icon name={open ? "expand_less" : "expand_more"} size={22} />
      </button>
      <div className="hidden text-[22px] font-bold text-brand sm:block">
        Sonovarem
      </div>
      <div className="flex gap-2">
        <HelpButton />
        <Link
          to="/settings"
          aria-label="Settings"
          className="inline-flex size-12 items-center justify-center rounded-full border border-line bg-surface text-brand-deep hover:bg-lime-tint"
        >
          <Icon name="settings" size={24} />
        </Link>
      </div>
      <ModeSheet open={open} onOpenChange={setOpen} current={mode} />
    </header>
  )
}

/**
 * S05g mode switcher (mockups/J4), also opened from Settings: switching keeps the conversation;
 * voice needs the mic step only if it was never granted.
 */
export function ModeSheet({
  open,
  onOpenChange,
  current,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  current: Mode
}) {
  const navigate = useNavigate()
  const api = useApi()
  const choose = (mode: Mode) => {
    onOpenChange(false)
    if (mode === current) return
    session.set({ mode })
    if (session.get().user) void api.me.update({ mode })
    if (isVoiceMode(mode) && session.get().micStatus !== "granted") {
      void navigate({ to: "/microphone" })
      return
    }
    if (isVoiceMode(mode)) {
      // Confirmed aloud in the new mode's language (PR-MOD-02).
      setTimeout(
        () =>
          void player.playPrompt(
            "PR-MOD-02",
            mode === "twi_voice" ? "tw" : "en",
          ),
        400,
      )
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92dvh] w-[calc(100%-2rem)] max-w-[640px] gap-5 overflow-y-auto rounded-card border-none bg-surface p-6 shadow-[0_12px_40px_rgb(0_0_0/0.18)] sm:max-w-[640px] sm:p-8"
      >
        <div className="flex items-center gap-3">
          <DialogTitle className="m-0 flex-1 text-[28px] leading-tight font-bold">
            Which way do you want to talk now?
          </DialogTitle>
          <CircleButton
            icon="close"
            aria-label="Close"
            className="text-ink-muted"
            onClick={() => onOpenChange(false)}
          />
        </div>
        {MODE_OPTIONS.map((option) =>
          option.mode === current ? (
            <button
              key={option.mode}
              type="button"
              aria-current="true"
              onClick={() => onOpenChange(false)}
              className="flex min-h-32 items-center gap-5 rounded-panel border-2 border-brand bg-lime-tint px-6 py-5 text-left text-ink"
            >
              <span className="flex size-20 flex-none items-center justify-center rounded-full bg-brand">
                <Icon
                  name={option.mode === "english_text" ? "menu_book" : "mic"}
                  fill
                  size={44}
                  className="text-on-brand"
                />
              </span>
              <span className="flex flex-1 flex-col gap-1">
                <span className="text-[26px] font-bold">{option.title}</span>
                <span className="text-[17px] text-ink-muted">
                  {option.subtitle}
                </span>
              </span>
              <span className="inline-flex flex-none items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 font-ui text-[13px] font-semibold text-on-brand">
                <Icon name="check" size={16} />
                Now
              </span>
            </button>
          ) : (
            <div key={option.mode} className="relative flex">
              <button
                type="button"
                onClick={() => choose(option.mode)}
                className="flex min-h-24 flex-1 items-center gap-5 rounded-panel border border-line bg-surface py-4 pr-20 pl-6 text-left text-ink hover:bg-lime-tint"
              >
                <ModeIcon mode={option.mode} size="sm" />
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[22px] font-bold">{option.title}</span>
                  <span className="text-[17px] text-ink-muted">
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
                className="absolute top-1/2 right-3 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-transparent text-brand hover:bg-surface"
              >
                <Icon name="volume_up" size={24} />
              </button>
            </div>
          ),
        )}
        <DialogDescription className="m-0 flex items-center gap-2 text-base text-ink-muted">
          <Icon name="forum" size={20} />
          Your conversation stays. New answers come in the way you choose.
        </DialogDescription>
      </DialogContent>
    </Dialog>
  )
}
