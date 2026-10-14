import { createFileRoute, redirect } from "@tanstack/react-router"
import { MicrophoneScreen } from "@/features/onboarding/MicrophoneScreen"
import { requireConsent } from "@/session/guards"
import { session } from "@/session/store"

export const Route = createFileRoute("/microphone")({
  beforeLoad: () => {
    const to = requireConsent()
    if (to) throw redirect({ to })
  },
  component: Microphone,
  head: () => ({ meta: [{ title: "Microphone · Sonovarem" }] }),
})

function Microphone() {
  return <MicrophoneScreen denied={session.get().micStatus === "denied"} />
}
