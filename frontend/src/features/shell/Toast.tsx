/**
 * A short confirmation that hides itself (mockups/J4 S05e: "Done. I have forgotten…"). The live
 * region is always rendered so screen readers announce each new message.
 */

import { useEffect } from "react"
import { cn } from "@/lib/utils"
import { Icon } from "./Icon"

export function Toast({
  message,
  onHide,
  durationMs = 5000,
  className,
}: {
  message?: string
  onHide: () => void
  durationMs?: number
  className?: string
}) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(onHide, durationMs)
    return () => clearTimeout(timer)
  }, [message, onHide, durationMs])
  return (
    <div role="status" className={cn("self-center", className)}>
      {message && (
        <span className="inline-flex items-center gap-2.5 rounded-full bg-toast px-5.5 py-3.5 font-ui text-[15px] font-semibold text-on-toast shadow-card-strong">
          <Icon name="check_circle" size={20} className="text-toast-icon" />
          {message}
        </span>
      )}
    </div>
  )
}
