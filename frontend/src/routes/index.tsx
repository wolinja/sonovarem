import { createFileRoute } from "@tanstack/react-router"
import { StartScreen } from "@/features/onboarding/StartScreen"

export const Route = createFileRoute("/")({
  component: StartScreen,
  head: () => ({ meta: [{ title: "Sonovarem" }] }),
})
