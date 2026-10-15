import { createFileRoute } from "@tanstack/react-router"
import { OperatorScreen } from "@/features/team/OperatorScreen"

// Team routes skip the farmer onboarding guards; the server checks the operator role (P1-05 TB6).
export const Route = createFileRoute("/team/review")({
  component: OperatorScreen,
  head: () => ({ meta: [{ title: "Operator review · Sonovarem Team" }] }),
})
