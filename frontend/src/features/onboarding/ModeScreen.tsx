/** S02 Mode picker (mockups/J1/S02). Twi first and largest; each card can say its own name. */

import { useNavigate } from "@tanstack/react-router"
import type { Mode } from "@/api/contract"
import { player } from "@/audio/player"
import { promptText } from "@/audio/prompts"
import { usePromptsOnMount } from "@/features/shell/audioHooks"
import { Icon } from "@/features/shell/Icon"
import { ModeCards } from "@/features/shell/ModeCards"
import { session } from "@/session/store"
import { OnboardingLayout, ReplayOnBrand } from "./OnboardingLayout"

export function ModeScreen() {
  const navigate = useNavigate()
  usePromptsOnMount(["PR-ONB-01", "PR-ONB-02"])

  const choose = async (mode: Mode) => {
    session.set({ mode })
    await navigate({ to: "/consent" })
  }

  return (
    <OnboardingLayout
      step={2}
      showReturning
      speaking={`“${promptText("PR-ONB-02")}”`}
      asideBody={
        <ReplayOnBrand
          onClick={() => void player.playPrompt("PR-ONB-02", "tw")}
        />
      }
    >
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <h1 className="m-0 text-3xl leading-tight font-bold sm:text-[34px]">
          How do you want to talk?
        </h1>
        <ModeCards onChoose={choose} />
        <p className="m-0 flex items-center gap-2 text-base text-ink-muted">
          <Icon name="swap_horiz" size={20} />
          You can change this at any time from the top of the screen.
        </p>
      </div>
    </OnboardingLayout>
  )
}
