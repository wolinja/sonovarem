import { createFileRoute, redirect } from "@tanstack/react-router"
import { ConversationScreen } from "@/features/conversation/ConversationScreen"
import { requireConsent } from "@/session/guards"

export const Route = createFileRoute("/ask")({
  beforeLoad: () => {
    const to = requireConsent()
    if (to) throw redirect({ to })
  },
  component: ConversationScreen,
  head: () => ({ meta: [{ title: "Ask · Sonovarem" }] }),
})
