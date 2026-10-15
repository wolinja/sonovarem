import { useEffect, useState } from "react"

/** Whole seconds until `at` (a Date.now() timestamp), ticking; undefined when there is no `at`. */
export function useSecondsUntil(at?: number): number | undefined {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!at) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [at])
  return at ? Math.max(0, Math.ceil((at - now) / 1000)) : undefined
}

/** 24 → "0:24" */
export const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
