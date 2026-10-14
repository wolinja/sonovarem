import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { ApiProvider, createApi } from "./api"
import { client } from "./client/client.gen"
import "./index.css"
import { routeTree } from "./routeTree.gen"

// The generated client is used by the HTTP adapter once the /v1 routes exist.
client.setConfig({
  baseURL: import.meta.env.VITE_API_URL ?? "",
})

const api = createApi()
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

const router = createRouter({ routeTree })
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ApiProvider value={api}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ApiProvider>
  </StrictMode>,
)
