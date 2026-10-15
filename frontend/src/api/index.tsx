import { createContext, type ReactNode, useContext } from "react"
import { API_MODE } from "@/config/devFlags"
import { createHttpApi } from "./http/adapter"
import { createMockApi, type MockControls } from "./mock/adapter"
import type { SonovaremApi } from "./port"

export type { SonovaremApi } from "./port"

interface ApiBundle {
  api: SonovaremApi
  /** Only set in mock mode; used by the dev scenario panel. */
  mockControls?: MockControls
}

export function createApi(): ApiBundle {
  if (API_MODE === "http") return { api: createHttpApi() }
  const { api, controls } = createMockApi()
  return { api, mockControls: controls }
}

const ApiContext = createContext<ApiBundle | null>(null)

export function ApiProvider({
  value,
  children,
}: {
  value: ApiBundle
  children: ReactNode
}) {
  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>
}

function useBundle(): ApiBundle {
  const bundle = useContext(ApiContext)
  if (!bundle) throw new Error("useApi must be used inside <ApiProvider>")
  return bundle
}

export function useApi(): SonovaremApi {
  return useBundle().api
}

export function useMockControls(): MockControls | undefined {
  return useBundle().mockControls
}
