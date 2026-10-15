/** S01 Start (mockups/J1/S01): one tap unlocks audio, then onboarding continues. */

import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { playEarcon } from "@/audio/earcons"
import { player } from "@/audio/player"
import { Icon } from "@/features/shell/Icon"
import { nextOnboardingStep } from "@/session/guards"
import { OnboardingLayout } from "./OnboardingLayout"

export function StartScreen() {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)

  const start = async () => {
    setStarting(true)
    // Must run inside the tap: browsers only allow audio after a user gesture (A1, X-3).
    await player.unlock()
    playEarcon("E0")
    const next = nextOnboardingStep()
    await navigate({ to: next === "/" ? "/mode" : next })
  }

  return (
    <OnboardingLayout
      step={1}
      showReturning
      showHelp={false}
      asideBody={
        <div className="flex flex-col gap-2 sm:gap-6">
          <p className="m-0 text-2xl leading-tight font-bold sm:text-[34px]">
            Ask about your farm. Hear the answer.
          </p>
          <p className="m-0 text-lg leading-relaxed font-medium text-on-brand-soft sm:text-xl">
            Every step is spoken aloud. You can listen and tap, no reading
            needed.
          </p>
        </div>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <button
          type="button"
          onClick={start}
          disabled={starting}
          aria-label="Start. Tap to turn on sound"
          className="flex size-46 items-center justify-center rounded-full bg-lime-tint"
        >
          <span className="flex size-38 items-center justify-center rounded-full bg-lime shadow-card-strong">
            <Icon name="volume_up" fill size={76} className="text-on-lime" />
          </span>
        </button>
        <div className="flex max-w-[460px] flex-col gap-3">
          <h1 className="m-0 text-3xl leading-tight font-bold sm:text-[34px]">
            Tap to start
          </h1>
          <p className="m-0 text-lg leading-relaxed text-ink-muted">
            Sonovarem will speak to you. Turn your volume up or put on
            earphones.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 font-ui text-sm font-medium text-ink-muted">
        <Icon name="headphones" size={20} />
        Works best in Chrome on Android or a laptop
      </div>
    </OnboardingLayout>
  )
}
