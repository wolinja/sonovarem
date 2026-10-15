import { createFileRoute } from "@tanstack/react-router"
import { CodeScreen } from "@/features/auth/CodeScreen"

export const Route = createFileRoute("/sign-in/code")({
  component: CodeScreen,
  head: () => ({ meta: [{ title: "Type the code · Sonovarem" }] }),
})
