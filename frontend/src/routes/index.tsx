import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [{ title: "Sonovarem" }],
  }),
})

// Placeholder until the PWA scaffold (T-006) replaces it with the farmer flow
function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-4 text-center">
      <h1 className="text-3xl font-bold">Sonovarem</h1>
      <p className="text-muted-foreground">
        Asante Twi voice farm advisor. Work in progress.
      </p>
    </main>
  )
}
