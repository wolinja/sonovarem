import { useCallback, useEffect, useRef, useState } from "react"
import { player } from "@/audio/player"

/**
 * Play / pause for one clip in the team views, with a progress clock. Progress is timed from the
 * clip duration the server sends, because the shared player does not expose the element's
 * currentTime (stand-in speech has none). Pausing stops the clip; play starts it again.
 */
export function useClip(url: string | undefined, durationS = 0, rate = 1) {
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const startedAt = useRef(0)
  const run = useRef(0)

  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => {
      const s = ((performance.now() - startedAt.current) / 1000) * rate
      setPosition(Math.min(durationS, s))
    }, 200)
    return () => clearInterval(timer)
  }, [playing, durationS, rate])

  const stop = useCallback(() => {
    run.current++
    player.stop()
    setPlaying(false)
  }, [])

  const play = useCallback(async () => {
    if (!url) return
    const id = ++run.current
    startedAt.current = performance.now()
    setPosition(0)
    setPlaying(true)
    const result = await player.playClip(url, { rate })
    if (run.current !== id) return
    setPlaying(false)
    if (result === "ended") setPosition(durationS)
  }, [url, rate, durationS])

  // A new item resets the clock; leaving the screen stops the sound.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the clip changes
  useEffect(() => {
    setPosition(0)
    return stop
  }, [url, stop])

  return {
    playing,
    position,
    durationS,
    toggle: () => (playing ? stop() : void play()),
    replay: () => void play(),
    stop,
  }
}
