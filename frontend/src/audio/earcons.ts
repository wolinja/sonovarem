/**
 * Earcons E0–E5 (P1-04 §4.1): one meaning each, always paired with a visual state.
 * PROVISIONAL WebAudio tones until the designed sounds arrive (T-052); swap `play` for clip
 * playback then, keeping the same ids.
 */

export type EarconId = "E0" | "E1" | "E2" | "E3" | "E4" | "E5"

/** [frequency Hz, start s, duration s] */
type Note = [number, number, number]

const SHAPES: Record<Exclude<EarconId, "E3">, Note[]> = {
  // E0 welcome / audio on: soft ascending
  E0: [
    [523.25, 0, 0.18],
    [659.25, 0.18, 0.18],
    [783.99, 0.36, 0.3],
  ],
  // E1 listening now: rising two-note
  E1: [
    [587.33, 0, 0.11],
    [880, 0.11, 0.13],
  ],
  // E2 got it: falling two-note (mirror of E1)
  E2: [
    [880, 0, 0.11],
    [587.33, 0.11, 0.13],
  ],
  // E4 done / saved
  E4: [
    [659.25, 0, 0.12],
    [987.77, 0.12, 0.22],
  ],
  // E5 problem: low, short, not alarming
  E5: [
    [311.13, 0, 0.16],
    [261.63, 0.16, 0.22],
  ],
}

let ctx: AudioContext | undefined

export function audioContext(): AudioContext | undefined {
  if (typeof window === "undefined" || !("AudioContext" in window))
    return undefined
  ctx ??= new AudioContext()
  return ctx
}

function tone(c: AudioContext, [freq, start, dur]: Note, volume: number) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  const t0 = c.currentTime + start
  osc.type = "sine"
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gain).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

export function playEarcon(id: Exclude<EarconId, "E3">) {
  const c = audioContext()
  if (c?.state !== "running") return
  for (const note of SHAPES[id]) tone(c, note, 0.18)
}

let workingTimer: ReturnType<typeof setInterval> | undefined

/** E3 working pulse: low volume, 1.2 s period, until stopped (P1-04 §3.2). */
export function startWorkingPulse() {
  if (workingTimer) return
  const pulse = () => {
    const c = audioContext()
    if (c?.state === "running") tone(c, [392, 0, 0.25], 0.05)
  }
  pulse()
  workingTimer = setInterval(pulse, 1200)
}

export function stopWorkingPulse() {
  if (workingTimer) clearInterval(workingTimer)
  workingTimer = undefined
}
