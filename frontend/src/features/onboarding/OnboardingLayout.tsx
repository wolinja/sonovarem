/**
 * The split layout (mockups/J1, J3, J5): a green aside with the brand, what is being spoken, and
 * the step dots (onboarding) or a footer line (sign-in, exits); the main area holds the one
 * action. Below ~920 px the aside stacks on top.
 */

import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { pillClass } from "@/features/shell/buttons"
import { HelpButton } from "@/features/shell/HelpButton"
import { Icon } from "@/features/shell/Icon"
import { cn } from "@/lib/utils"

export const ONBOARDING_STEPS = 4

export function OnboardingLayout({
  step,
  speaking,
  asideBody,
  asideFooter,
  topLeft,
  showReturning = false,
  showHelp = true,
  children,
}: {
  /** Onboarding step (1–4) for the dots; omit outside onboarding. */
  step?: number
  /** What the app is saying right now, shown as a quote ("Now speaking"). */
  speaking?: ReactNode
  /** Extra aside content (replay buttons, listening status). */
  asideBody?: ReactNode
  /** Bottom of the aside when there are no step dots. */
  asideFooter?: ReactNode
  /** Left of the top row, e.g. a "Not now" back link. */
  topLeft?: ReactNode
  showReturning?: boolean
  showHelp?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-wrap bg-bg text-ink">
      {/* Compact on phones so the one action stays above the fold; the full mockup aside from sm up. */}
      <aside className="box-border flex max-w-full flex-[1_1_360px] flex-col justify-between gap-4 bg-brand px-4 py-5 text-on-brand sm:gap-12 sm:px-12 sm:pt-12 sm:pb-10">
        <div className="flex items-baseline justify-between gap-4 sm:flex-col sm:items-start">
          <div className="text-[22px] font-bold tracking-[-0.01em] sm:text-[28px]">
            Sonovarem
          </div>
          <div className="hidden font-ui text-sm font-semibold text-on-brand-soft sm:block">
            Farming answers, by voice
          </div>
          {step && <StepLabel step={step} className="sm:hidden" />}
        </div>
        {(speaking || asideBody) && (
          <div className="flex flex-col gap-3 sm:gap-5">
            {speaking && (
              <>
                <div className="inline-flex items-center gap-2 font-ui text-sm font-semibold text-on-brand-soft">
                  <Icon name="graphic_eq" fill size={20} />
                  Now speaking
                </div>
                <p className="m-0 text-xl leading-tight font-bold sm:text-[28px]">
                  {speaking}
                </p>
              </>
            )}
            {asideBody}
          </div>
        )}
        {step ? (
          <StepDots step={step} className="hidden sm:flex" />
        ) : (
          // Always present, so the "Now speaking" block stays in the middle (mockups/J3, J5).
          <div className="hidden font-ui text-sm font-semibold text-on-brand-soft sm:block">
            {asideFooter}
          </div>
        )}
      </aside>
      <main className="box-border flex min-w-0 flex-[999_1_560px] flex-col gap-6 px-4 pt-6 pb-10 sm:gap-8 sm:px-12 sm:pt-8 sm:pb-12">
        <div className="flex flex-wrap items-center justify-end gap-3">
          {topLeft && <div className="mr-auto">{topLeft}</div>}
          {showReturning && (
            <Link to="/sign-in" className={pillClass("outline")}>
              <Icon name="person" size={22} />
              I've used this before
            </Link>
          )}
          {showHelp && <HelpButton />}
        </div>
        {children}
      </main>
    </div>
  )
}

function StepLabel({ step, className }: { step: number; className?: string }) {
  return (
    <div
      className={cn(
        "font-ui text-sm font-semibold text-on-brand-soft",
        className,
      )}
    >
      Step {step} of {ONBOARDING_STEPS}
    </div>
  )
}

function StepDots({ step, className }: { step: number; className?: string }) {
  return (
    <div className={cn("flex-col gap-3", className)}>
      <StepLabel step={step} />
      <div className="flex gap-2" aria-hidden="true">
        {Array.from({ length: ONBOARDING_STEPS }, (_, i) => {
          const n = i + 1
          return (
            <span
              key={n}
              className={cn(
                "h-2 rounded-full",
                n === step ? "w-10 bg-lime" : "w-4",
                n < step && "bg-on-brand-soft",
                n > step && "bg-white/35",
              )}
            />
          )
        })}
      </div>
    </div>
  )
}

/** "Not now", "Change number": a quiet back link at the top left. */
export function BackLink({
  to,
  children,
}: {
  to: string
  children: ReactNode
}) {
  return (
    <Link to={to} className={pillClass("ghost", "md", "px-4.5 text-base")}>
      <Icon name="arrow_back" size={22} />
      {children}
    </Link>
  )
}

export function ReplayOnBrand({
  onClick,
  children = "Hear again",
}: {
  onClick: () => void
  children?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={pillClass("on-brand", "md", "self-start")}
    >
      <Icon name="replay" size={22} />
      {children}
    </button>
  )
}
