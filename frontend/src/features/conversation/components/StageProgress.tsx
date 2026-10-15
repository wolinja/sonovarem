/**
 * StageProgress (P1-04 §5.7, mockups/J2 Thinking): named steps with the current one highlighted.
 * Steps that do not apply to this turn (no sensor, text mode) are omitted, not greyed.
 */

import type { WorkingStep } from "@/api/events"
import { promptText } from "@/audio/prompts"
import { PillButton } from "@/features/shell/buttons"
import { Icon } from "@/features/shell/Icon"
import type { Phase, StepStatus } from "../machine/turnMachine"

interface Step {
  id: string
  label: string
  icon: string
  status: StepStatus
}

const WORKING_LABEL: Record<WorkingStep, { label: string; icon: string }> = {
  guide: { label: "Checking the guide", icon: "auto_stories" },
  soil: { label: "Checking your field sensor", icon: "potted_plant" },
  weather: { label: "Checking the weather", icon: "partly_cloudy_day" },
  answer: { label: "Preparing your answer", icon: "edit_note" },
}

export function buildSteps(
  phase: Phase,
  voice: boolean,
  workingSteps: WorkingStep[],
  statuses: Partial<Record<WorkingStep, StepStatus>>,
): Step[] {
  const sendingDone = phase !== "uploading" && phase !== "sending"
  const heardDone = !["uploading", "sending", "transcribing"].includes(phase)
  const steps: Step[] = [
    {
      id: "sending",
      label: "Sending",
      icon: "upload",
      status: sendingDone ? "done" : "active",
    },
  ]
  if (voice) {
    steps.push({
      id: "listening",
      label: "Listening to you",
      icon: "hearing",
      status: heardDone ? "done" : sendingDone ? "active" : "pending",
    })
  }
  const working = workingSteps.length
    ? workingSteps
    : (["guide", "answer"] as WorkingStep[])
  let activeSeen = false
  for (const id of working) {
    let status: StepStatus = statuses[id] ?? "pending"
    if (
      heardDone &&
      phase === "thinking" &&
      status === "pending" &&
      !activeSeen
    ) {
      // The first not-yet-started step is where we are now.
      status = Object.values(statuses).includes("active") ? "pending" : "active"
    }
    if (status === "active") activeSeen = true
    steps.push({ id, ...WORKING_LABEL[id], status })
  }
  return steps
}

export function StageProgress({
  steps,
  stalled,
  slowOffer,
  voice,
  onKeepWaiting,
  onTryAgain,
}: {
  steps: Step[]
  stalled: boolean
  slowOffer: boolean
  voice: boolean
  onKeepWaiting: () => void
  onTryAgain: () => void
}) {
  const current = steps.find((s) => s.status === "active") ?? steps.at(-1)
  return (
    <section className="flex flex-col gap-5 rounded-card border border-line-subtle bg-surface p-6 shadow-card sm:p-8">
      <div role="status" className="flex items-center gap-3.5">
        <span className="flex size-12 flex-none items-center justify-center rounded-full bg-lime-tint">
          <Icon
            name={current?.icon ?? "hourglass_top"}
            size={26}
            className="text-brand"
          />
        </span>
        <span className="text-2xl font-bold">{current?.label}</span>
      </div>
      <ol className="m-0 flex list-none flex-col p-0">
        {steps.map((step) => (
          <li key={step.id} className="flex min-h-12 items-center gap-3.5">
            {step.status === "done" ? (
              <span className="flex size-8 flex-none items-center justify-center rounded-full bg-brand">
                <Icon name="check" size={20} className="text-on-brand" />
              </span>
            ) : step.status === "active" ? (
              <span className="flex size-8 flex-none items-center justify-center rounded-full border-3 border-lime bg-lime-tint">
                <span className="size-3 animate-pulse rounded-full bg-brand" />
              </span>
            ) : (
              <span className="size-8 flex-none rounded-full border-2 border-line bg-surface" />
            )}
            <span
              className={
                step.status === "active"
                  ? "text-lg font-bold"
                  : "text-lg text-ink-muted"
              }
            >
              {step.label}
              {step.status === "done" && (
                <span className="sr-only"> (done)</span>
              )}
            </span>
          </li>
        ))}
      </ol>
      {stalled && !slowOffer && (
        <p role="status" className="m-0 text-lg text-ink-muted">
          {promptText("PR-WRK-05")}
        </p>
      )}
      {slowOffer && (
        <div className="flex flex-col gap-3 rounded-row bg-attention-bg p-4">
          <p className="m-0 flex items-center gap-2 text-lg text-attention">
            <Icon name="schedule" size={22} />
            {promptText("PR-WRK-06")}
          </p>
          <div className="flex flex-wrap gap-3">
            <PillButton variant="primary" onClick={onKeepWaiting}>
              Keep waiting
            </PillButton>
            <PillButton icon="refresh" onClick={onTryAgain}>
              Try again
            </PillButton>
          </div>
        </div>
      )}
      {voice && (
        <div className="flex items-center gap-2.5 pt-1 font-ui text-sm font-medium text-ink-muted">
          <Icon name="volume_up" size={18} />A soft sound plays while I work.
        </div>
      )}
    </section>
  )
}
