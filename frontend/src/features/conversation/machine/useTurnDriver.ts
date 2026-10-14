/**
 * Runs the turn machine: the only place with side effects for S05. It records, uploads (with the
 * IndexedDB retry buffer), subscribes to turn events, plays echo/answer audio and prompts, and
 * owns the D5 timers. Components get `state` plus intent functions; they never call the API.
 */

import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import { useApi } from "@/api"
import {
  ApiError,
  type ClientTimings,
  type ConfirmDecision,
  type ConfirmMethod,
  type Lang,
  type Mode,
  type RatingFace,
  type TurnKind,
} from "@/api/contract"
import type { RenditionEvent } from "@/api/events"
import type { Unsubscribe } from "@/api/port"
import {
  playEarcon,
  startWorkingPulse,
  stopWorkingPulse,
} from "@/audio/earcons"
import { type PlayResult, player } from "@/audio/player"
import type { PromptId } from "@/audio/prompts"
import { Recorder } from "@/audio/recorder"
import { type PendingTurn, retryBuffer } from "@/audio/retryBuffer"
import { scaled, timing } from "@/config/timing"
import { session, useSession } from "@/session/store"
import {
  initialConversation,
  isVoice,
  type QuestionSource,
  type QueuedClip,
  spokenLang,
  turnReducer,
  WORKING_PHASES,
} from "./turnMachine"

export type StartResult = "started" | "need_mic" | "mic_denied" | "busy"

export interface Rendition {
  status: "loading" | "ready" | "failed"
  sentences: { seq: number; text: string }[]
  clips: QueuedClip[]
}

const newClientTurnId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `ct-${Date.now()}-${Math.random().toString(36).slice(2)}`

export function useTurnDriver(mode: Mode) {
  const api = useApi()
  const [state, dispatch] = useReducer(turnReducer, mode, initialConversation)
  const [level, setLevel] = useState(0)
  const [renditions, setRenditions] = useState<Record<string, Rendition>>({})
  const [echoPlayedFor, setEchoPlayedFor] = useState<string>()

  const stateRef = useRef(state)
  stateRef.current = state
  const recorder = useRef<Recorder | null>(null)
  const stream = useRef<Unsubscribe | null>(null)
  const conversationId = useRef<string | null>(null)
  const pending = useRef<PendingTurn | null>(null)
  const timings = useRef<ClientTimings>({})
  const playingClip = useRef<string | null>(null)
  const ratingComment = useRef<string | undefined>(undefined)

  const prefs = useSession((s) => s.prefs)
  const lang: Lang = spokenLang(mode)
  const voice = isVoice(mode)

  /** Prompts the machine plays by itself; the "no prompts by themselves" setting silences them. */
  const prompt = useCallback(
    (id: PromptId): Promise<PlayResult> => {
      if (!voice) return Promise.resolve("ended")
      if (session.get().prefs.noAutoPrompts) return Promise.resolve("stopped")
      return player.playPrompt(id, lang)
    },
    [voice, lang],
  )

  // ---- mode ------------------------------------------------------------------

  useEffect(() => {
    if (mode !== stateRef.current.mode) dispatch({ type: "MODE_CHANGED", mode })
  }, [mode])

  // ---- submission ------------------------------------------------------------

  const ensureConversation = useCallback(async () => {
    if (!conversationId.current) {
      const res = await api.conversations.start(stateRef.current.mode)
      conversationId.current = res.conversation_id
    }
    return conversationId.current
  }, [api])

  const subscribe = useCallback(
    (turnId: string) => {
      stream.current?.()
      stream.current = api.turns.events(turnId, (event) =>
        dispatch({ type: "SERVER", event }),
      )
    },
    [api],
  )

  const submit = useCallback(
    async (turn: PendingTurn) => {
      pending.current = turn
      try {
        const res = await api.turns.submit(
          {
            conversation_id: turn.conversationId,
            mode: turn.mode,
            kind: turn.kind,
            audio: turn.audio,
            text: turn.text,
            menu_item_id: turn.menuItemId,
            t_audio_end_client: turn.tAudioEndClient,
          },
          turn.clientTurnId,
        )
        // Server ack: the buffered copy is no longer needed (P1-04 §3.3).
        await retryBuffer.remove(turn.clientTurnId)
        dispatch({ type: "SUBMITTED", turnId: res.turn_id })
        subscribe(res.turn_id)
      } catch (err) {
        const code =
          err instanceof ApiError &&
          (err.code === "offline" || err.code === "rate_limited")
            ? err.code
            : "server"
        dispatch({ type: "SUBMIT_FAILED", code })
      }
    },
    [api, subscribe],
  )

  /** Cancels the running server turn, if any (a new question replaces it, ADR-20). */
  const cancelRunningTurn = useCallback(() => {
    const s = stateRef.current
    const turnId = s.turn?.turnId
    if (turnId && !s.turn?.done) void api.turns.cancel(turnId)
    stream.current?.()
    stream.current = null
  }, [api])

  // ---- recording -------------------------------------------------------------

  const stopRecording = useCallback(async () => {
    const rec = recorder.current
    if (!rec || stateRef.current.phase !== "listening") return
    recorder.current = null
    const recording = await rec.stop()
    const stopTs = Date.now()
    playEarcon("E2") // "got it", within 200 ms of stop (C1)
    timings.current = { stop_ts: stopTs, feedback_ts: Date.now() }
    setLevel(0)
    const clientTurnId = newClientTurnId()
    const s = stateRef.current
    const turn: PendingTurn = {
      clientTurnId,
      conversationId: await ensureConversation(),
      mode: s.mode,
      kind: s.clarifyPending ? "clarify_answer" : "question",
      audio: recording.blob,
      tAudioEndClient: stopTs,
      createdAt: stopTs,
    }
    dispatch({
      type: "RECORD_STOP",
      clientTurnId,
      recordedMs: recording.durationMs,
    })
    await retryBuffer.put(turn)
    await submit(turn)
  }, [ensureConversation, submit])

  const startRecording = useCallback(async (): Promise<StartResult> => {
    if (!isVoice(stateRef.current.mode)) return "busy"
    if (recorder.current) return "busy"
    if (session.get().micStatus !== "granted") return "need_mic"
    cancelRunningTurn()
    player.stop()
    const rec = new Recorder()
    try {
      await rec.start({
        onLevel: setLevel,
        onAutoStop: () => void stopRecording(),
        tapToStop: session.get().prefs.tapToStop,
      })
    } catch {
      session.set({ micStatus: "denied" })
      return "mic_denied"
    }
    recorder.current = rec
    dispatch({ type: "RECORD_START" })
    playEarcon("E1")
    return "started"
  }, [cancelRunningTurn, stopRecording])

  const cancelRecording = useCallback(() => {
    recorder.current?.cancel()
    recorder.current = null
    setLevel(0)
    dispatch({ type: "RECORD_CANCEL" })
  }, [])

  // Release the microphone if the screen unmounts mid-recording.
  useEffect(
    () => () => {
      recorder.current?.cancel()
      stream.current?.()
      player.stop()
      stopWorkingPulse()
    },
    [],
  )

  // ---- typed questions, quick replies, menu choices ----------------------------

  const sendText = useCallback(
    async (
      text: string,
      opts: {
        kind?: TurnKind
        source?: Exclude<QuestionSource, "voice">
        menuItemId?: string
      } = {},
    ) => {
      const trimmed = text.trim()
      if (!trimmed) return
      cancelRunningTurn()
      player.stop()
      const s = stateRef.current
      const kind: TurnKind =
        opts.kind ??
        (opts.menuItemId
          ? "menu_choice"
          : s.clarifyPending || s.phase === "clarifying"
            ? "clarify_answer"
            : "question")
      const clientTurnId = newClientTurnId()
      timings.current = { stop_ts: Date.now(), feedback_ts: Date.now() }
      dispatch({
        type: "SEND",
        clientTurnId,
        kind,
        text: trimmed,
        source: opts.source ?? "typed",
      })
      const turn: PendingTurn = {
        clientTurnId,
        conversationId: await ensureConversation(),
        mode: s.mode,
        kind,
        text: trimmed,
        menuItemId: opts.menuItemId,
        createdAt: Date.now(),
      }
      await retryBuffer.put(turn)
      await submit(turn)
    },
    [cancelRunningTurn, ensureConversation, submit],
  )

  // ---- offline retry (RETRY_WAIT) ------------------------------------------------

  const [retryAt, setRetryAt] = useState<number>()
  const retryNowRef = useRef<() => void>(() => {})
  useEffect(() => {
    if (state.phase !== "retry_wait") {
      setRetryAt(undefined)
      return
    }
    let fired = false
    const retry = () => {
      const turn = pending.current
      if (fired || !turn) return
      fired = true
      dispatch({ type: "RETRYING" })
      void submit(turn)
    }
    retryNowRef.current = retry
    const backoff = timing.retryBackoffMs
    const delay = scaled(
      backoff[Math.min(state.retryAttempt, backoff.length - 1)],
    )
    setRetryAt(Date.now() + delay)
    const timer = setTimeout(retry, delay)
    window.addEventListener("online", retry, { once: true })
    if (state.retryAttempt === 0) void prompt("PR-ERR-01")
    return () => {
      clearTimeout(timer)
      window.removeEventListener("online", retry)
    }
  }, [state.phase, state.retryAttempt, submit, prompt])

  /** "Try now" on the offline card: retry without waiting for the backoff. */
  const retryNow = useCallback(() => retryNowRef.current(), [])

  // ---- echo-back -----------------------------------------------------------------

  const confirm = useCallback(
    (decision: ConfirmDecision, method: ConfirmMethod = "tap") => {
      const s = stateRef.current
      const turnId = s.turn?.turnId
      const lateNo = s.phase === "thinking" && decision === "no"
      if (
        !turnId ||
        (s.phase !== "await_confirm" && s.phase !== "echo_back" && !lateNo)
      )
        return
      player.stop()
      dispatch({ type: "CONFIRM", decision })
      void api.turns.confirm(turnId, { decision, method })
    },
    [api],
  )

  const echoClip = state.turn?.echoClip
  const turnKey = state.turn?.turnId
  useEffect(() => {
    // On a language mismatch the offer is spoken instead of the echo (S05h).
    if (!echoClip || !turnKey || stateRef.current.langOffer) return
    let alive = true
    stopWorkingPulse()
    timings.current.echo_audio_ts = Date.now()
    void player.playClip(echoClip).then(() => {
      if (alive) setEchoPlayedFor(turnKey)
    })
    return () => {
      alive = false
    }
  }, [echoClip, turnKey])

  // The implicit yes starts counting once the echo has played (P1-04 §3.1, OQ-U1).
  const implicit = state.turn?.implicit
  useEffect(() => {
    if (state.phase !== "await_confirm" || !implicit?.allowed) return
    if (state.langOffer || prefs.alwaysConfirm) return
    if (echoPlayedFor !== turnKey || state.turn?.implicitDeadline) return
    dispatch({
      type: "IMPLICIT_ARMED",
      deadline:
        Date.now() + scaled(implicit.afterS * 1000 || timing.implicitYesMs),
    })
  }, [
    state.phase,
    implicit,
    echoPlayedFor,
    turnKey,
    state.turn?.implicitDeadline,
    state.langOffer,
    prefs.alwaysConfirm,
  ])

  const deadline = state.turn?.implicitDeadline
  useEffect(() => {
    if (state.phase !== "await_confirm" || !deadline) return
    const timer = setTimeout(
      () => confirm("yes", "implicit_timeout"),
      Math.max(0, deadline - Date.now()),
    )
    return () => clearTimeout(timer)
  }, [state.phase, deadline, confirm])

  // ---- language mismatch (S05h) -------------------------------------------------

  const langOffer = state.langOffer
  useEffect(() => {
    if (langOffer) void prompt("PR-MOD-04")
  }, [langOffer, prompt])

  /** "Switch to English": answer this question in the language the farmer spoke. */
  const acceptLangOffer = useCallback(() => {
    const heard = stateRef.current.langOffer
    if (!heard) return
    session.set({ mode: heard === "en" ? "english_voice" : "twi_voice" })
    dispatch({ type: "DISMISS_LANG_OFFER" })
    confirm("yes")
  }, [confirm])

  // ---- working cues and D5 timers ---------------------------------------------------

  const working =
    WORKING_PHASES.includes(state.phase) || state.phase === "reprompting"
  useEffect(() => {
    if (working && voice) startWorkingPulse()
    else stopWorkingPulse()
  }, [working, voice])

  const lastEventId = state.turn?.lastEventId
  // biome-ignore lint/correctness/useExhaustiveDependencies: every new event restarts the "still working" timer
  useEffect(() => {
    if (state.phase !== "thinking" && state.phase !== "transcribing") return
    const timer = setTimeout(
      () => dispatch({ type: "STALLED" }),
      scaled(timing.stalledMs),
    )
    return () => clearTimeout(timer)
  }, [state.phase, lastEventId])

  // Slow offer and timeout count from the confirmation (the farmer's own time is not counted).
  const thinkingTurn =
    state.phase === "thinking" || state.phase === "sending"
      ? (turnKey ?? state.turn?.clientTurnId)
      : undefined
  useEffect(() => {
    if (!thinkingTurn) return
    const slow = setTimeout(
      () => dispatch({ type: "SLOW" }),
      scaled(timing.slowMs),
    )
    const out = setTimeout(
      () => dispatch({ type: "TIMEOUT" }),
      scaled(timing.timeoutMs),
    )
    return () => {
      clearTimeout(slow)
      clearTimeout(out)
    }
  }, [thinkingTurn])

  useEffect(() => {
    if (state.stalled) void prompt("PR-WRK-05")
  }, [state.stalled, prompt])

  useEffect(() => {
    if (state.slowOffer) void prompt("PR-WRK-06")
  }, [state.slowOffer, prompt])

  // ---- answer audio queue -------------------------------------------------------------

  const nextClip = state.turn?.audioQueue[0]
  useEffect(() => {
    if (!nextClip || !turnKey) return
    const key = `${turnKey}:${nextClip.seq}:${nextClip.url}`
    if (playingClip.current === key) return
    playingClip.current = key
    timings.current.first_answer_audio_ts ??= Date.now()
    void player.playClip(nextClip.url).then((result) => {
      playingClip.current = null
      dispatch({ type: "CLIP_FINISHED", result })
    })
  }, [nextClip, turnKey])

  const stopAudio = useCallback(() => player.stop(), [])

  /** "Hear again": replays the clips of an answer without touching the machine. */
  const playClips = useCallback(async (clips: QueuedClip[]) => {
    for (const clip of clips) {
      const result = await player.playClip(clip.url)
      if (result !== "ended") break
    }
  }, [])

  const retryAudio = useCallback(() => {
    const clips = stateRef.current.turn?.clips ?? []
    dispatch({ type: "RETRY_AUDIO", clips })
  }, [])

  // ---- phase-entry prompts and earcons -----------------------------------------------

  const phase = state.phase
  useEffect(() => {
    switch (phase) {
      case "error":
        playEarcon("E5")
        break
      case "fallback_menu":
        void prompt("PR-ECH-04")
        break
      case "rating":
        timings.current.answer_complete_ts = Date.now()
        if (turnKey) void api.turns.clientTimings(turnKey, timings.current)
        void prompt("PR-RAT-01")
        break
    }
  }, [phase, prompt, api, turnKey])

  const errorKind = state.error?.kind
  useEffect(() => {
    if (!errorKind) return
    const ids: Record<string, PromptId> = {
      upload_failed: "PR-ERR-02",
      server: "PR-ERR-02",
      nothing_heard: "PR-ERR-03",
      timeout: "PR-ERR-05",
      rate_limited: "PR-ERR-06",
    }
    void prompt(ids[errorKind])
  }, [errorKind, prompt])

  const clarifyAudio = state.turn?.clarify?.audio_url
  useEffect(() => {
    if (state.phase === "clarifying" && clarifyAudio && voice)
      void player.playClip(clarifyAudio)
  }, [state.phase, clarifyAudio, voice])

  const idk = state.turn?.idk
  useEffect(() => {
    if (!idk || !voice) return
    void prompt("PR-IDK-01").then((r) =>
      r === "ended" ? prompt("PR-IDK-02") : r,
    )
  }, [idk, voice, prompt])

  // After the 1st "no": "Sorry, please ask again", then listen again.
  useEffect(() => {
    if (!state.reprompted || state.phase !== "idle") return
    let alive = true
    playEarcon("E5")
    void prompt("PR-ECH-03").then((r) => {
      if (
        alive &&
        r === "ended" &&
        stateRef.current.reprompted &&
        stateRef.current.phase === "idle"
      ) {
        void startRecording()
      }
    })
    return () => {
      alive = false
    }
  }, [state.reprompted, state.phase, prompt, startRecording])

  // ---- recovery -----------------------------------------------------------------------

  const retryAfterError = useCallback(async () => {
    const s = stateRef.current
    if (s.error?.kind === "nothing_heard") {
      dispatch({ type: "DISMISS" })
      return startRecording()
    }
    const old = pending.current
    if (!old) {
      dispatch({ type: "DISMISS" })
      return
    }
    cancelRunningTurn()
    await retryBuffer.remove(old.clientTurnId)
    const turn = {
      ...old,
      clientTurnId: newClientTurnId(),
      createdAt: Date.now(),
    }
    dispatch({ type: "RESUBMIT", clientTurnId: turn.clientTurnId })
    await retryBuffer.put(turn)
    await submit(turn)
  }, [cancelRunningTurn, startRecording, submit])

  const dismiss = useCallback(() => {
    const old = pending.current
    if (old) void retryBuffer.remove(old.clientTurnId)
    pending.current = null
    cancelRunningTurn()
    dispatch({ type: "DISMISS" })
  }, [cancelRunningTurn])

  const cancelWhileWaiting = useCallback(() => {
    // RETRY_WAIT cancel: the recording is deleted (P1-04 §3.1).
    dismiss()
  }, [dismiss])

  const keepWaiting = useCallback(() => dispatch({ type: "KEEP_WAITING" }), [])

  // ---- rating -----------------------------------------------------------------------

  const rate = useCallback(
    (face: RatingFace) => {
      playEarcon("E4")
      player.stop()
      dispatch({ type: "RATE", face })
      void prompt("PR-RAT-02")
    },
    [prompt],
  )

  const setRatingComment = useCallback((text: string) => {
    ratingComment.current = text || undefined
  }, [])

  const finishRating = useCallback(() => {
    const r = stateRef.current.rating
    if (r?.face) {
      void api.answers.rate(r.answerId, {
        face: r.face,
        comment_text: ratingComment.current,
      })
    }
    ratingComment.current = undefined
    player.stop()
    dispatch({ type: r?.face ? "RATING_DONE" : "SKIP_RATING" })
    session.set({ answeredOnce: true })
  }, [api])

  // ---- Hear in Twi -------------------------------------------------------------------

  const hearInTwi = useCallback(
    async (answerId: string) => {
      const existing = renditions[answerId]
      if (existing?.status === "ready") return playClips(existing.clips)
      if (existing?.status === "loading") return
      setRenditions((r) => ({
        ...r,
        [answerId]: { status: "loading", sentences: [], clips: [] },
      }))
      void player.playPrompt("PR-TWI-01", "tw")
      try {
        const { rendition_id } = await api.answers.renditionTw(answerId)
        const unsub = api.answers.renditionEvents(
          rendition_id,
          (e: RenditionEvent) => {
            setRenditions((r) => {
              const cur = r[answerId] ?? {
                status: "loading" as const,
                sentences: [],
                clips: [],
              }
              switch (e.event) {
                case "answer_text":
                  return {
                    ...r,
                    [answerId]: {
                      ...cur,
                      sentences: [
                        ...cur.sentences,
                        { seq: e.data.seq, text: e.data.text },
                      ],
                    },
                  }
                case "answer_audio":
                  return {
                    ...r,
                    [answerId]: {
                      ...cur,
                      clips: [
                        ...cur.clips,
                        { seq: e.data.seq, lang: "tw", url: e.data.clip_url },
                      ],
                    },
                  }
                case "done":
                  unsub()
                  return { ...r, [answerId]: { ...cur, status: "ready" } }
                default:
                  unsub()
                  return { ...r, [answerId]: { ...cur, status: "failed" } }
              }
            })
          },
        )
      } catch {
        setRenditions((r) => ({
          ...r,
          [answerId]: { status: "failed", sentences: [], clips: [] },
        }))
      }
    },
    [api, renditions, playClips],
  )

  // Play the Twi rendition once it is ready.
  const readyRendition = Object.entries(renditions).find(
    ([, r]) => r.status === "ready" && r.clips.length,
  )
  const readyKey = readyRendition?.[0]
  const autoPlayed = useRef(new Set<string>())
  useEffect(() => {
    if (!readyKey || autoPlayed.current.has(readyKey)) return
    autoPlayed.current.add(readyKey)
    void playClips(renditions[readyKey].clips)
  }, [readyKey, renditions, playClips])

  return {
    state,
    level,
    retryAt,
    retryNow,
    renditions,
    startRecording,
    stopRecording,
    cancelRecording,
    sendText,
    confirm,
    stopAudio,
    playClips,
    retryAudio,
    retryAfterError,
    dismiss,
    cancelWhileWaiting,
    keepWaiting,
    rate,
    setRatingComment,
    finishRating,
    hearInTwi,
    acceptLangOffer,
    /** "Stay in Twi": drop the offer and ask again in the current language. */
    declineLangOffer: () => {
      dispatch({ type: "DISMISS_LANG_OFFER" })
      return startRecording()
    },
  }
}

export type TurnDriver = ReturnType<typeof useTurnDriver>
