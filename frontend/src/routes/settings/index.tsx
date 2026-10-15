import { createFileRoute, redirect } from "@tanstack/react-router"
import { SettingsScreen } from "@/features/settings/SettingsScreen"
import { requireConsent } from "@/session/guards"

export const Route = createFileRoute("/settings/")({
  beforeLoad: () => {
    const to = requireConsent()
    if (to) throw redirect({ to })
  },
  component: SettingsScreen,
  head: () => ({ meta: [{ title: "Settings · Sonovarem" }] }),
})
