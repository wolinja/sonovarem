/**
 * State shared by S06 and S07 for one sign-in attempt. Kept in memory only: the full phone number
 * is never written to storage on the device. A reload sends the farmer back to S06.
 */

export interface SignInFlow {
  phone: string
  requestId: string
  memoryConsent: boolean
  resendAfterS: number
}

let flow: SignInFlow | null = null

export const signInFlow = {
  get: () => flow,
  set: (next: SignInFlow) => {
    flow = next
  },
  clear: () => {
    flow = null
  },
}

/** Ghana numbers: "024 123 4567", "24 123 4567" or "+233 24 123 4567" → "+233241234567". */
export function normalizeGhanaPhone(input: string): string | null {
  let digits = input.replace(/\D/g, "")
  if (digits.startsWith("233")) digits = digits.slice(3)
  if (digits.startsWith("0")) digits = digits.slice(1)
  return /^[2-5]\d{8}$/.test(digits) ? `+233${digits}` : null
}

/** "+233241234567" → "024 123 4567" for display and read-back. */
export function formatLocal(e164: string): string {
  const d = `0${e164.replace(/^\+233/, "")}`
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
}
