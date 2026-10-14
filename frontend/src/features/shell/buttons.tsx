/**
 * Button styles from the mockups. Every farmer target is ≥ 48 px (P1-04 §5.4); primary actions
 * ≥ 64 px. Use `pillClass` on <Link> elements so links and buttons look the same.
 */

import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Icon } from "./Icon"

type PillVariant =
  | "primary"
  | "outline"
  | "outline-muted"
  | "on-brand"
  | "ghost"
type PillSize = "md" | "lg" | "xl"

const VARIANT: Record<PillVariant, string> = {
  primary: "bg-lime text-on-lime hover:brightness-95",
  outline: "border border-line bg-surface text-brand-deep hover:bg-lime-tint",
  "outline-muted":
    "border border-line bg-surface text-ink-muted hover:bg-sunken",
  "on-brand":
    "border border-white/50 bg-transparent text-on-brand hover:bg-white/10",
  ghost: "bg-transparent text-brand-deep hover:bg-lime-tint",
}

const SIZE: Record<PillSize, string> = {
  md: "min-h-12 px-5 text-base",
  lg: "min-h-14 px-6 text-[17px]",
  xl: "min-h-16 px-8 text-xl",
}

export function pillClass(
  variant: PillVariant = "outline",
  size: PillSize = "md",
  className?: string,
) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-ui font-semibold no-underline transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    VARIANT[variant],
    SIZE[size],
    className,
  )
}

export function PillButton({
  variant,
  size,
  icon,
  iconAfter,
  className,
  children,
  ...props
}: ComponentProps<"button"> & {
  variant?: PillVariant
  size?: PillSize
  icon?: string
  iconAfter?: string
}) {
  return (
    <button
      type="button"
      className={pillClass(variant, size, className)}
      {...props}
    >
      {icon && <Icon name={icon} size={22} />}
      {children}
      {iconAfter && <Icon name={iconAfter} size={24} />}
    </button>
  )
}

/** Round icon-only button (Help, Settings, Hear this). Needs an aria-label. */
export function CircleButton({
  icon,
  size = 48,
  className,
  ...props
}: ComponentProps<"button"> & {
  icon: string
  size?: number
  "aria-label": string
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-surface text-brand-deep hover:bg-lime-tint",
        className,
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      <Icon name={icon} size={Math.round(size / 2)} />
    </button>
  )
}

/** Large ✓ / ✗ disc with a label underneath (consent, echo-back). */
export function DecisionDisc({
  kind,
  label,
  size = 96,
  ring,
  className,
  ...props
}: ComponentProps<"button"> & {
  kind: "yes" | "no"
  label: ReactNode
  size?: number
  /** Countdown ring around the Yes disc (implicit yes). */
  ring?: ReactNode
}) {
  const yes = kind === "yes"
  return (
    <button
      type="button"
      className={cn(
        "group flex flex-col items-center gap-2.5 bg-transparent text-ink",
        className,
      )}
      {...props}
    >
      <span className="relative flex items-center justify-center">
        {ring}
        <span
          className={cn(
            "flex items-center justify-center rounded-full transition-transform group-active:scale-95",
            yes
              ? "bg-lime text-on-lime"
              : "border-2 border-line bg-surface text-ink-muted",
          )}
          style={{ width: size, height: size }}
        >
          <Icon
            name={yes ? "check" : "close"}
            bold
            size={Math.round(size * 0.54)}
          />
        </span>
      </span>
      <span className="text-lg font-semibold">{label}</span>
    </button>
  )
}
