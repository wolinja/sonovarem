/**
 * Every client-side timer in one place, with its source. Values are milliseconds unless named
 * otherwise. `scaled()` applies the dev timescale so tests do not wait 45 s.
 */

import { devFlags } from "./devFlags"

export const timing = {
  /** VAD end-of-speech: default 2.5 s, never below 2.0 s (P1-04 §3.1, B2). */
  silenceStopMs: 2500,
  /** Recording cap (P1-04 §3.1). */
  maxRecordMs: 60_000,
  /** THINKING: say "still working" after this long without events (PR-WRK-05). */
  stalledMs: 15_000,
  /** Offer "keep waiting or try again" (PR-WRK-06). */
  slowMs: 30_000,
  /** Turn ceiling, C7 (P1-04 §3.2). */
  timeoutMs: 45_000,
  /** RETRY_WAIT backoff, then every 30 s (P1-04 §3.1). */
  retryBackoffMs: [2000, 4000, 8000, 16000, 30000],
  /** Default implicit-yes window if the server does not send one (OQ-U1). */
  implicitYesMs: 5000,
  /** OTP resend becomes available (P1-04 §3.3 otp_not_received). */
  otpResendMs: 30_000,
  /** WebOTP auto-read wait before offering guided entry (P1-04 §3.4). */
  otpGuidedOfferMs: 20_000,
  /** Toast lifetime (P1-04 §5.7). */
  toastMs: 4000,
} as const

export function scaled(ms: number): number {
  return Math.max(0, Math.round(ms * devFlags.timescale))
}
