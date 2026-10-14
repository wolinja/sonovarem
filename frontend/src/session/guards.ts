/**
 * Route guards for the onboarding order (P1-04 §2.3): S01 → S02 → S03 → (S04 voice only) → S05.
 * Used in TanStack Router `beforeLoad`; each returns the route to send the farmer to, or null.
 */

import { CONSENT_VERSION } from "@/config/content"
import { isVoiceMode, type SessionState, session } from "./store"

export type OnboardingPath = "/" | "/mode" | "/consent" | "/microphone" | "/ask"

export function hasValidConsent(s: SessionState): boolean {
  return !!s.age?.is18 && s.consent?.version === CONSENT_VERSION
}

/** The furthest screen the farmer may be on, given what they have done so far. */
export function nextOnboardingStep(
  s: SessionState = session.get(),
): OnboardingPath {
  if (!s.mode) return "/mode"
  if (!hasValidConsent(s)) return "/consent"
  if (isVoiceMode(s.mode) && s.micStatus === "unknown") return "/microphone"
  return "/ask"
}

export function requireMode(): OnboardingPath | null {
  return session.get().mode ? null : "/mode"
}

export function requireConsent(): OnboardingPath | null {
  const s = session.get()
  if (!s.mode) return "/mode"
  return hasValidConsent(s) ? null : "/consent"
}
