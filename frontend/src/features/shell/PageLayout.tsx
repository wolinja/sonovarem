/** Layout for single-task screens outside the conversation (settings, delete; mockups/J3, J5). */

import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { pillClass } from "./buttons"
import { HelpButton } from "./HelpButton"
import { Icon } from "./Icon"

export function PageLayout({
  title,
  icon,
  backTo = "/ask",
  backLabel = "Back to questions",
  centered = false,
  children,
}: {
  /** Page heading with an icon disc (S08); omit when the content has its own heading (S09). */
  title?: string
  icon?: string
  backTo?: "/ask" | "/settings" | "/" | "/sign-in"
  backLabel?: string
  /** Centre a single card vertically (S09). */
  centered?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <header className="sticky top-0 z-10 flex min-h-18 flex-wrap items-center justify-between gap-3 border-b border-line-subtle bg-surface px-4 py-3 sm:px-8">
        <Link to={backTo} className={pillClass("outline", "md", "pr-4.5 pl-3")}>
          <Icon name="arrow_back" size={22} />
          {backLabel}
        </Link>
        <div className="hidden text-[22px] font-bold text-brand sm:block">
          Sonovarem
        </div>
        <HelpButton />
      </header>
      <main
        className={cn(
          "box-border flex flex-1 flex-col items-center px-4 pt-8 pb-14 sm:px-6 sm:pt-10",
          centered && "justify-center",
        )}
      >
        <div className="flex w-full max-w-[760px] flex-col gap-7">
          {title && (
            <div className="flex items-center gap-4">
              {icon && (
                <span className="flex size-16 flex-none items-center justify-center rounded-full bg-lime-tint">
                  <Icon name={icon} size={34} className="text-brand" />
                </span>
              )}
              <h1 className="m-0 text-3xl leading-tight font-bold sm:text-[34px]">
                {title}
              </h1>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  )
}

export const cardClass =
  "flex flex-col gap-5 rounded-card border border-line-subtle bg-surface p-6 shadow-card sm:p-8"
