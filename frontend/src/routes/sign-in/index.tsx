import { createFileRoute } from "@tanstack/react-router"
import { PhoneScreen } from "@/features/auth/PhoneScreen"

export const Route = createFileRoute("/sign-in/")({
  component: PhoneScreen,
  head: () => ({ meta: [{ title: "Save me · Sonovarem" }] }),
})
