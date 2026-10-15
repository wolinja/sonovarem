import { cn } from "@/lib/utils"

/**
 * Material Symbols Outlined (the mockups' icon set). Icons are always decorative here: the
 * control that holds one carries the accessible name.
 */
export function Icon({
  name,
  fill = false,
  bold = false,
  size = 24,
  className,
}: {
  name: string
  fill?: boolean
  bold?: boolean
  size?: number
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("ms", fill && "fill", bold && "bold", className)}
      style={{ fontSize: size }}
    >
      {name}
    </span>
  )
}
