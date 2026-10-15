/**
 * Development switches read once from the URL (and kept for the tab in sessionStorage), so a link
 * like `/?scenario=idk&timescale=0.05&audio=off` sets up a demo or a Playwright run.
 * They only take effect in mock mode; the HTTP adapter ignores them.
 */

export const API_MODE: "mock" | "http" =
  import.meta.env.VITE_API_MODE === "http" ? "http" : "mock"

export const IS_MOCK = API_MODE === "mock"

const STORAGE_KEY = "sv-dev-flags"

export interface DevFlags {
  /** Mock scenario id (see api/mock/scenarios.ts). */
  scenario?: string
  /** Multiplies every timer and mock delay; 0.05 makes a 45 s timeout take ~2 s. */
  timescale: number
  /** "off" replaces audio playback with timed silence (headless browsers, quiet demos). */
  audio: "on" | "off"
}

function read(): DevFlags {
  const flags: DevFlags = { timescale: 1, audio: "on" }
  if (!IS_MOCK || typeof window === "undefined") return flags
  try {
    Object.assign(
      flags,
      JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}"),
    )
  } catch {
    // ignore unreadable storage
  }
  const params = new URLSearchParams(window.location.search)
  const scenario = params.get("scenario")
  const timescale = Number(params.get("timescale"))
  const audio = params.get("audio")
  if (scenario) flags.scenario = scenario
  if (timescale > 0) flags.timescale = timescale
  if (audio === "on" || audio === "off") flags.audio = audio
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(flags))
  } catch {
    // ignore
  }
  return flags
}

export const devFlags: DevFlags = read()

export function setDevFlag<K extends keyof DevFlags>(
  key: K,
  value: DevFlags[K],
) {
  devFlags[key] = value
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(devFlags))
  } catch {
    // ignore
  }
}
