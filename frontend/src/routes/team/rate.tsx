import { createFileRoute } from "@tanstack/react-router"
import { RaterScreen } from "@/features/team/RaterScreen"

// Team routes skip the farmer onboarding guards; the server checks the rater role (P1-05 TB6).
export const Route = createFileRoute("/team/rate")({
  component: RaterScreen,
  head: () => ({ meta: [{ title: "Rater scoring · Sonovarem Team" }] }),
})
