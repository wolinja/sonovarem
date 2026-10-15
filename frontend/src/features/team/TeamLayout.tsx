/**
 * Team views (mockups/J6): laptop-first, denser than the farmer app (P1-04 density 6). Two
 * columns from 1024 px (content left, scoring right), one column below.
 */

import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { ApiError } from "@/api/contract"
import { Icon } from "@/features/shell/Icon"

const navClass = "rounded-full px-4 py-2.5 no-underline"
const navActive = { className: "bg-lime-tint text-brand-deep" }
const navInactive = { className: "text-ink-muted hover:bg-sunken" }

export function TeamLayout({
  headerEnd,
  toolbar,
  children,
}: {
  headerEnd?: ReactNode
  toolbar?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <header className="flex flex-none flex-wrap items-center gap-x-6 gap-y-3 border-b border-line-subtle bg-surface px-4 py-3 lg:px-8">
        <div className="flex items-baseline gap-2.5">
          <span className="text-xl font-bold text-brand">Sonovarem</span>
          <span className="rounded-full bg-lime-tint px-2.5 py-0.75 font-ui text-[13px] font-semibold text-brand-deep">
            Team
          </span>
        </div>
        <nav
          aria-label="Team tools"
          className="flex gap-1 font-ui text-sm font-semibold"
        >
          <Link
            to="/team/rate"
            className={navClass}
            activeProps={navActive}
            inactiveProps={navInactive}
          >
            Rater scoring
          </Link>
          <Link
            to="/team/review"
            className={navClass}
            activeProps={navActive}
            inactiveProps={navInactive}
          >
            Operator review
          </Link>
        </nav>
        <div className="flex min-w-50 flex-1 flex-wrap items-center justify-end gap-3">
          {headerEnd}
        </div>
      </header>
      {toolbar}
      <main className="box-border flex flex-1 flex-col gap-6 px-4 py-6 lg:flex-row lg:items-start lg:px-8">
        {children}
      </main>
    </div>
  )
}

export const teamCard =
  "flex flex-col rounded-panel border border-line-subtle bg-surface p-5"

/** Small Geist label above a block of content. */
export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-ui text-xs font-semibold text-ink-muted">
      {children}
    </span>
  )
}

export function Chip({
  children,
  tone = "sunken",
}: {
  children: ReactNode
  tone?: "sunken" | "highlight" | "outline"
}) {
  const tones = {
    sunken: "bg-sunken",
    highlight: "bg-highlight text-[#364e00]",
    outline: "border border-line-subtle bg-surface",
  }
  return (
    <span
      className={`rounded-full px-2.5 py-1 font-ui text-[13px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

/** Team screens never show raw errors; a role or network problem gets one plain line. */
export function TeamError({ error }: { error: unknown }) {
  const code = error instanceof ApiError ? error.code : "server"
  const text =
    code === "forbidden"
      ? "This view is for the Sonovarem team. Sign in with a team or rater number."
      : code === "offline"
        ? "No connection. This view needs the network."
        : code === "not_implemented"
          ? "The team API is not connected yet."
          : "Something went wrong loading this view. Try again."
  return (
    <p
      role="alert"
      className="m-0 flex items-center gap-3 rounded-panel bg-problem-bg px-5 py-4 text-problem"
    >
      <Icon name="error" size={22} />
      {text}
    </p>
  )
}
