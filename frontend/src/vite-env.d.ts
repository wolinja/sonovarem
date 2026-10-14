/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** "mock" (default) or "http"; see src/api/index.tsx */
  readonly VITE_API_MODE?: "mock" | "http"
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
