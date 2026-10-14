/**
 * Content that is configuration, not code (P1-04 §11.6). The consent slots and the crop scope are
 * set by the owner and the W2 gate; changing a slot must bump `CONSENT_VERSION`, which re-asks
 * layer-1 consent on next open.
 *
 * Bracketed values are deliberate placeholders, as in the mockups: do not invent them.
 */

export const CONSENT_VERSION = "2026-10-draft-1"

export const consentSlots = {
  /** OQ-U9 / P0-05 OQ-C2 */
  controller: "[CONTROLLER NAME]",
  /** Set at the W2 gate. Khaya appears only with a signed DPA. */
  providers: "[PROVIDER NAMES]",
  countries: "[COUNTRIES]",
}

/** OQ-U14: maize only, or maize + cassava, after the W2 data-audit gate. */
export const cropScope = {
  label: "Maize planting, fertiliser, pests and disease",
}

export interface ExampleQuestion {
  id: string
  text: string
}

/** PR-ASK-02 examples (P0-03 §2, P1 persona questions). */
export const exampleQuestions: ExampleQuestion[] = [
  { id: "ex-plant", text: "When should I plant maize?" },
  { id: "ex-fert", text: "Which fertiliser for young maize?" },
  { id: "ex-worms", text: "Worms are eating my maize leaves" },
]

export const supportContact = {
  /** Shown on "Get help" during field sessions. */
  label: "Ask the Sonovarem team member with you",
}

/**
 * Layer-3 "keep my recordings" stays off until IRB approval (P1-04 §2.4). Flip this only when
 * written approval or exemption exists.
 */
export const RECORDINGS_CONSENT_AVAILABLE = false
