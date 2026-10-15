/**
 * Mock-mode control panel: pick the scenario the next turn follows, go offline, speed up timers,
 * silence audio, and reset. Not part of the farmer UI; rendered only with the mock adapter.
 * The same settings can be passed in the URL: `?scenario=idk&timescale=0.1&audio=off`.
 */

import { useState, useSyncExternalStore } from "react"
import { useMockControls } from "@/api"
import { retryBuffer } from "@/audio/retryBuffer"
import { devFlags, setDevFlag } from "@/config/devFlags"
import { Icon } from "@/features/shell/Icon"
import { session } from "@/session/store"

export function ScenarioPanel() {
  const controls = useMockControls()
  const [open, setOpen] = useState(false)
  const [, force] = useState(0)
  const scenarioId = useSyncExternalStore(
    (cb) => controls?.subscribe(cb) ?? (() => {}),
    () => controls?.getScenarioId() ?? "",
  )
  const offline = useSyncExternalStore(
    (cb) => controls?.subscribe(cb) ?? (() => {}),
    () => controls?.isOffline() ?? false,
  )
  if (!controls) return null

  const resetAll = async () => {
    controls.resetServer()
    await retryBuffer.clear()
    session.reset()
    window.location.assign("/")
  }

  return (
    <div className="fixed right-2 bottom-16 z-50 flex flex-col items-end font-ui text-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Mock scenarios"
        className="flex items-center gap-1.5 rounded-full border border-dashed border-attention-line bg-attention-bg px-3 py-1.5 font-semibold text-attention shadow"
      >
        <Icon name="science" size={18} />
        {open ? "Close" : `Mock: ${scenarioId}`}
        {offline && " · offline"}
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-2 flex max-h-[75dvh] w-80 flex-col gap-3 overflow-y-auto rounded-row border border-line-subtle bg-surface p-4 text-ink shadow-xl">
          <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
            <legend className="mb-1 font-semibold">Next turn follows</legend>
            {controls.scenarios.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer gap-2 rounded-input p-1.5 hover:bg-sunken"
              >
                <input
                  type="radio"
                  name="scenario"
                  checked={scenarioId === s.id}
                  onChange={() => controls.setScenario(s.id)}
                  className="mt-1"
                />
                <span className="flex flex-col">
                  <span className="font-semibold">{s.label}</span>
                  <span className="text-xs text-ink-muted">
                    {s.description}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={offline}
              onChange={(e) => controls.setOffline(e.target.checked)}
            />
            Network offline
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={devFlags.audio === "off"}
              onChange={(e) => {
                setDevFlag("audio", e.target.checked ? "off" : "on")
                force((n) => n + 1)
              }}
            />
            Silent audio (timed)
          </label>
          <label className="flex items-center justify-between gap-2">
            Timer speed
            <select
              value={String(devFlags.timescale)}
              onChange={(e) => {
                setDevFlag("timescale", Number(e.target.value))
                force((n) => n + 1)
              }}
              className="rounded-input border border-line px-2 py-1"
            >
              <option value="1">Real time</option>
              <option value="0.25">4× faster</option>
              <option value="0.05">20× faster</option>
            </select>
          </label>
          <p className="m-0 text-xs text-ink-muted">
            OTP code: {controls.otpCode}. Numbers ending in 0000 are returning
            users with memory.
          </p>
          <button
            type="button"
            onClick={() => void resetAll()}
            className="rounded-full border border-line px-3 py-2 font-semibold"
          >
            Reset everything and restart
          </button>
        </div>
      )}
    </div>
  )
}
