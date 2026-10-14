/** S03x Under-18 exit (mockups/J5): polite, nothing stored (P0-05 J1). */

import { Link, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { promptText } from "@/audio/prompts"
import { usePrompt, usePromptsOnMount } from "@/features/shell/audioHooks"
import { PillButton } from "@/features/shell/buttons"
import { Icon } from "@/features/shell/Icon"
import { session } from "@/session/store"
import { OnboardingLayout, ReplayOnBrand } from "./OnboardingLayout"

export function UnderAgeScreen() {
  const navigate = useNavigate()
  const play = usePrompt()
  usePromptsOnMount(["PR-AGE-02"])
  useEffect(() => session.reset(), [])

  return (
    <OnboardingLayout
      speaking={`“${promptText("PR-AGE-02")}”`}
      asideBody={
        <ReplayOnBrand
          onClick={() => void play("PR-AGE-02", { force: true })}
        />
      }
      showHelp={false}
    >
      <div className="m-auto flex w-full max-w-[560px] flex-col items-center gap-6 text-center">
        <span className="flex size-28 items-center justify-center rounded-full bg-lime-tint">
          <Icon name="front_hand" size={60} className="text-brand" />
        </span>
        <h1 className="m-0 text-3xl leading-tight font-bold sm:text-[34px]">
          This service is for adults only
        </h1>
        <p className="m-0 text-[19px] leading-relaxed text-ink-muted">
          Thank you for your interest. Nothing you said or tapped was saved.
        </p>
        <div className="flex flex-col items-center gap-3 pt-2">
          <PillButton
            variant="primary"
            size="xl"
            icon="close"
            className="px-9"
            onClick={() => void navigate({ to: "/" })}
          >
            Close
          </PillButton>
          <Link
            to="/consent"
            className="inline-flex min-h-12 items-center font-ui text-base font-semibold text-brand-deep"
          >
            I answered by mistake
          </Link>
        </div>
      </div>
    </OnboardingLayout>
  )
}
