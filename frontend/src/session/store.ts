/**
 * Client session state: where the farmer is in onboarding, what they agreed to, and their mode.
 * A tiny external store (no library) persisted to localStorage; read it in components with
 * `useSession(selector)` and outside React (route guards) with `session.get()`.
 */

import { useSyncExternalStore } from "react"
import type { ConsentMethod, Mode } from "@/api/contract"

export type MicStatus = "unknown" | "granted" | "denied"

/** S08 "Recordings and listening" switches (mockups/J3). */
export interface ListeningPrefs {
  /** Never stop recording on silence; wait for the stop tap. */
  tapToStop: boolean
  /** Never use the implicit yes; always ask Yes or No. */
  alwaysConfirm: boolean
  /** Prompts play only when tapped (answers and echo-backs still play). */
  noAutoPrompts: boolean
}

export interface SessionState {
  mode: Mode | null
  age: { is18: boolean; method: ConsentMethod } | null
  /** Layer-1 service consent; a version change re-asks it (P1-04 §2.4). */
  consent: { version: string; method: ConsentMethod; at: string } | null
  /** Layer 2; undefined until asked at S06. */
  memoryConsent?: boolean
  /** Layer 3; off by default and forced off until IRB approval. */
  recordingsConsent: boolean
  micStatus: MicStatus
  provisionalUserId?: string
  user?: { id: string; phoneLast4?: string }
  /** Set after the first answer, so "Save me" is offered once (P1-04 §2.3). */
  answeredOnce: boolean
  savePromptDismissed: boolean
  /** PR-DIS-01 is spoken once, before the first question. */
  disclaimerHeard: boolean
  prefs: ListeningPrefs
}

const STORAGE_KEY = "sv-session"

export const initialSession: SessionState = {
  mode: null,
  age: null,
  consent: null,
  recordingsConsent: false,
  micStatus: "unknown",
  answeredOnce: false,
  savePromptDismissed: false,
  disclaimerHeard: false,
  prefs: { tapToStop: false, alwaysConfirm: false, noAutoPrompts: false },
}

function load(): SessionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      return {
        ...initialSession,
        ...saved,
        prefs: { ...initialSession.prefs, ...saved.prefs },
      }
    }
  } catch {
    // unreadable storage: start fresh
  }
  return initialSession
}

type Listener = () => void

function createSessionStore() {
  let state = load()
  const listeners = new Set<Listener>()

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore; the app still works for this tab
    }
  }

  return {
    get: () => state,
    set(
      patch:
        | Partial<SessionState>
        | ((s: SessionState) => Partial<SessionState>),
    ) {
      const next = typeof patch === "function" ? patch(state) : patch
      state = { ...state, ...next }
      persist()
      for (const l of listeners) l()
    },
    /** Sign-out, under-18 exit and account deletion: nothing kept (P0-05 J1, A8). */
    reset() {
      state = initialSession
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }
      for (const l of listeners) l()
    },
    subscribe(listener: Listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export const session = createSessionStore()

export function useSession<T>(selector: (s: SessionState) => T): T {
  return useSyncExternalStore(
    session.subscribe,
    () => selector(session.get()),
    () => selector(initialSession),
  )
}

export const isVoiceMode = (mode: Mode | null | undefined): boolean =>
  mode === "twi_voice" || mode === "english_voice"
