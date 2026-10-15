/**
 * Microphone capture: permission, MediaRecorder (Opus/WebM), a live input level for the
 * listening ring, end-of-speech by silence (P1-04 §3.1), and the 60 s cap.
 */

import { scaled, timing } from "@/config/timing"
import { audioContext } from "./earcons"

export type MicPermission = "granted" | "denied"

export async function requestMicrophone(): Promise<MicPermission> {
  if (!navigator.mediaDevices?.getUserMedia) return "denied"
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    for (const track of stream.getTracks()) track.stop()
    return "granted"
  } catch {
    return "denied"
  }
}

export interface Recording {
  blob: Blob
  mime: string
  durationMs: number
}

export type AutoStopReason = "silence" | "cap" | "no_speech"

export interface RecorderCallbacks {
  /** 0..1, about 15 times a second. */
  onLevel?(level: number): void
  onAutoStop?(reason: AutoStopReason): void
  /** Settings "Always wait for me to tap stop": no silence or no-speech stop (the cap stays). */
  tapToStop?: boolean
}

const SPEECH_LEVEL = 0.04
const NO_SPEECH_MS = 10_000

function pickMime(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
  return (
    candidates.find(
      (m) =>
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported(m),
    ) ?? ""
  )
}

export class Recorder {
  private stream?: MediaStream
  private media?: MediaRecorder
  private chunks: Blob[] = []
  private startedAt = 0
  private raf?: number
  private capTimer?: ReturnType<typeof setTimeout>
  private source?: MediaStreamAudioSourceNode

  async start(callbacks: RecorderCallbacks = {}): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    })
    const mime = pickMime()
    this.media = new MediaRecorder(
      this.stream,
      mime ? { mimeType: mime } : undefined,
    )
    this.chunks = []
    this.media.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }
    this.media.start(250)
    this.startedAt = performance.now()
    this.capTimer = setTimeout(
      () => callbacks.onAutoStop?.("cap"),
      scaled(timing.maxRecordMs),
    )
    this.watchLevel(callbacks)
  }

  private watchLevel(callbacks: RecorderCallbacks) {
    const ctx = audioContext()
    if (!ctx || !this.stream) return
    this.source = ctx.createMediaStreamSource(this.stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    this.source.connect(analyser)
    const data = new Uint8Array(analyser.fftSize)
    let heardSpeech = false
    let quietSince = performance.now()
    let lastEmit = 0

    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (const v of data) {
        const x = (v - 128) / 128
        sum += x * x
      }
      const level = Math.min(1, Math.sqrt(sum / data.length) * 4)
      const now = performance.now()
      if (now - lastEmit > 66) {
        callbacks.onLevel?.(level)
        lastEmit = now
      }
      if (level > SPEECH_LEVEL) {
        heardSpeech = true
        quietSince = now
      } else if (callbacks.tapToStop) {
        // keep listening until the farmer taps stop
      } else if (
        heardSpeech &&
        now - quietSince > scaled(timing.silenceStopMs)
      ) {
        callbacks.onAutoStop?.("silence")
        return
      } else if (!heardSpeech && now - this.startedAt > scaled(NO_SPEECH_MS)) {
        callbacks.onAutoStop?.("no_speech")
        return
      }
      this.raf = requestAnimationFrame(tick)
    }
    this.raf = requestAnimationFrame(tick)
  }

  async stop(): Promise<Recording> {
    const media = this.media
    const durationMs = performance.now() - this.startedAt
    const mime = media?.mimeType || "audio/webm"
    if (media && media.state !== "inactive") {
      await new Promise<void>((resolve) => {
        media.onstop = () => resolve()
        media.stop()
      })
    }
    this.release()
    return { blob: new Blob(this.chunks, { type: mime }), mime, durationMs }
  }

  cancel() {
    if (this.media && this.media.state !== "inactive") this.media.stop()
    this.chunks = []
    this.release()
  }

  private release() {
    if (this.raf) cancelAnimationFrame(this.raf)
    if (this.capTimer) clearTimeout(this.capTimer)
    this.source?.disconnect()
    for (const track of this.stream?.getTracks() ?? []) track.stop()
    this.stream = undefined
    this.media = undefined
    this.source = undefined
  }
}
