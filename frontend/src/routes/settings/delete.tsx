import { createFileRoute } from "@tanstack/react-router"
import { DeleteAccountScreen } from "@/features/settings/DeleteAccountScreen"

export const Route = createFileRoute("/settings/delete")({
  component: DeleteAccountScreen,
  head: () => ({ meta: [{ title: "Delete my account · Sonovarem" }] }),
})
