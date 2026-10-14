import { createFileRoute } from "@tanstack/react-router"
import { ModeScreen } from "@/features/onboarding/ModeScreen"

export const Route = createFileRoute("/mode")({
  component: ModeScreen,
  head: () => ({ meta: [{ title: "How do you want to talk? · Sonovarem" }] }),
})
