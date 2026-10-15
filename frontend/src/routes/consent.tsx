import { createFileRoute, redirect } from "@tanstack/react-router"
import { ConsentScreen } from "@/features/onboarding/ConsentScreen"
import { requireMode } from "@/session/guards"

export const Route = createFileRoute("/consent")({
  beforeLoad: () => {
    const to = requireMode()
    if (to) throw redirect({ to })
  },
  component: ConsentScreen,
  head: () => ({ meta: [{ title: "Before you ask · Sonovarem" }] }),
})
