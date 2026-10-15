import { createFileRoute } from "@tanstack/react-router"
import { UnderAgeScreen } from "@/features/onboarding/UnderAgeScreen"

export const Route = createFileRoute("/under-18")({
  component: UnderAgeScreen,
  head: () => ({ meta: [{ title: "Thank you · Sonovarem" }] }),
})
