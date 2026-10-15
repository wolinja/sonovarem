/**
 * S05 Conversation (mockups/J2). Renders from the turn machine state only; every action goes
 * through the driver. Overlays (echo-back, clarify, fallback, rating, errors) are machine phases.
 */

import { useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import type { Mode } from "@/api/contract"
import { player } from "@/audio/player"
import { exampleQuestions } from "@/config/content"
import { usePlayerPlaying, usePrompt } from "@/features/shell/audioHooks"
import { cn } from "@/lib/utils"
import { isVoiceMode, session, useSession } from "@/session/store"
import { AnswerCard } from "./components/AnswerCard"
import { Composer } from "./components/Composer"
import {
  ClarifyCard,
  DisclaimerCard,
  ErrorCard,
  ExamplesCard,
  FallbackMenu,
  LangOfferCard,
  RetryWaitCard,
  SavePromptCard,
} from "./components/cards"
import {
  EchoBackCard,
  PendingBubble,
  RejectedBubble,
  UserBubble,
} from "./components/EchoBackCard"
import { ListeningPanel } from "./components/ListeningPanel"
import { MemoryRecap } from "./components/MemoryRecap"
import { InlineRating, RatingCard } from "./components/RatingCard"
import { RecordFooter, recordButtonState } from "./components/RecordFooter"
import { buildSteps, StageProgress } from "./components/StageProgress"
import { TopBar } from "./components/TopBar"
import { spokenLang, WORKING_PHASES } from "./machine/turnMachine"
import { type StartResult, useTurnDriver } from "./machine/useTurnDriver"

/** PR-ASK-01 is spoken once per session, not on every return to this screen. */
let askHintSpoken = false

const ANNOUNCE: Partial<Record<string, string>> = {
  listening: "Listening",
  uploading: "Sending your question",
  sending: "Sending your question",
  await_confirm: "Is that what you asked?",
  thinking: "Working on your answer",
  answering: "Answer ready",
  rating: "Did this advice help you?",
  fallback_menu: "Here are some common questions",
  clarifying: "One question before I answer",
}

export function ConversationScreen() {
  const mode = useSession((s) => s.mode) as Mode
  const navigate = useNavigate()
  const driver = useTurnDriver(mode)
  const { state } = driver
  const playing = usePlayerPlaying()
  const play = usePrompt()
  const [modeSheetOpen, setModeSheetOpen] = useState(false)
  const voice = isVoiceMode(mode)
  const lang = spokenLang(mode)
  const turn = state.turn
  const showSavePrompt = useSession(
    (s) => s.answeredOnce && !s.user && !s.savePromptDismissed,
  )

  // PR-DIS-01 before the first question, then PR-ASK-01 once per session (P1-04 §3.1 IDLE).
  useEffect(() => {
    let alive = true
    void (async () => {
      if (!session.get().disclaimerHeard) {
        const r = await play("PR-DIS-01")
        if (r === "ended") session.set({ disclaimerHeard: true })
        if (!alive || r !== "ended") return
      }
      if (askHintSpoken) return
      askHintSpoken = true
      await play("PR-ASK-01")
    })()
    return () => {
      alive = false
    }
  }, [play])

  const pressRecord = async () => {
    const buttonState = recordButtonState(state.phase, playing)
    if (buttonState === "listening") return void driver.stopRecording()
    if (buttonState === "playing") return driver.stopAudio()
    await startOrMic(driver.startRecording)
  }

  const ask = (text: string) =>
    void driver.sendText(text, { source: "quick_reply" })

  const startOrMic = async (start: () => Promise<StartResult>) => {
    const result = await start()
    if (result === "need_mic" || result === "mic_denied")
      await navigate({ to: "/microphone" })
  }

  const isWorking =
    WORKING_PHASES.includes(state.phase) || state.phase === "reprompting"
  const showQuestion =
    turn?.question &&
    !["echo_back", "await_confirm", "listening", "retry_wait"].includes(
      state.phase,
    ) &&
    (turn.question.source !== "voice" || state.phase !== "transcribing")

  const steps = buildSteps(
    state.phase,
    voice,
    turn?.workingSteps ?? [],
    turn?.steps ?? {},
  )

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <TopBar
        mode={mode}
        modeSheetOpen={modeSheetOpen}
        onModeSheetChange={setModeSheetOpen}
      />

      <div className="sr-only" aria-live="polite">
        {ANNOUNCE[state.phase] ?? ""}
      </div>

      <main className="box-border flex flex-1 flex-col items-center px-4 py-8 sm:px-6 sm:py-10">
        <div
          className={cn(
            "flex w-full flex-col gap-6",
            voice ? "max-w-[720px]" : "max-w-[760px]",
          )}
        >
          {state.phase === "listening" ? (
            <ListeningPanel
              level={driver.level}
              onCancel={driver.cancelRecording}
            />
          ) : state.phase === "echo_back" || state.phase === "await_confirm" ? (
            turn?.question &&
            (state.langOffer ? (
              <>
                <UserBubble question={turn.question} />
                <LangOfferCard
                  heardLang={state.langOffer}
                  onHear={() => void play("PR-MOD-04", { force: true })}
                  onSwitch={driver.acceptLangOffer}
                  onStay={() => void startOrMic(driver.declineLangOffer)}
                />
              </>
            ) : (
              <EchoBackCard
                question={turn.question}
                awaiting={state.phase === "await_confirm"}
                implicitDeadline={turn.implicitDeadline}
                implicitTotalS={turn.implicit?.afterS}
                onReplay={() =>
                  turn.echoClip && void player.playClip(turn.echoClip)
                }
                onYes={() => driver.confirm("yes")}
                onNo={() => driver.confirm("no")}
              />
            ))
          ) : (
            <>
              {state.history.map((entry) => (
                <div key={entry.id} className="flex flex-col gap-6">
                  {entry.question && <UserBubble question={entry.question} />}
                  {(entry.sentences.length > 0 || entry.idk) && (
                    <AnswerCard
                      sentences={entry.sentences}
                      citations={entry.citations}
                      notices={entry.notices}
                      idk={entry.idk}
                      spokenLang={lang}
                      voice={voice}
                      clips={entry.clips}
                      interrupted={entry.interrupted}
                      answerId={entry.answerId}
                      rendition={
                        entry.answerId
                          ? driver.renditions[entry.answerId]
                          : undefined
                      }
                      onReplay={driver.playClips}
                      onHearTwi={driver.hearInTwi}
                    />
                  )}
                  {entry.clarify && !entry.sentences.length && (
                    <p
                      lang={lang}
                      className="m-0 rounded-panel bg-sunken px-5 py-4 text-lg"
                    >
                      {entry.clarify.text}
                    </p>
                  )}
                </div>
              ))}

              {state.phase === "idle" && state.history.length === 0 && (
                <>
                  <MemoryRecap />
                  <DisclaimerCard
                    onHear={() => void play("PR-DIS-01", { force: true })}
                  />
                  <ExamplesCard
                    examples={exampleQuestions}
                    voice={voice}
                    onAsk={ask}
                  />
                </>
              )}

              {state.phase === "idle" && state.reprompted && (
                <p
                  role="status"
                  className="m-0 rounded-panel bg-sunken px-5 py-4 text-lg"
                >
                  Sorry. Please ask again.
                </p>
              )}

              {state.phase === "idle" &&
                state.history.length > 0 &&
                showSavePrompt && (
                  <SavePromptCard
                    onDismiss={() => session.set({ savePromptDismissed: true })}
                  />
                )}

              {showQuestion && turn?.question && (
                <UserBubble
                  question={turn.question}
                  onNotWhatIAsked={
                    state.phase === "thinking" &&
                    turn.question.source === "voice"
                      ? () => driver.confirm("no")
                      : undefined
                  }
                />
              )}

              {state.phase === "retry_wait" && (
                <>
                  <PendingBubble
                    question={turn?.question}
                    durationS={
                      turn?.recordedMs !== undefined
                        ? turn.recordedMs / 1000
                        : undefined
                    }
                  />
                  <RetryWaitCard
                    retryAt={driver.retryAt}
                    onHear={() => void play("PR-ERR-01", { force: true })}
                    onTryNow={driver.retryNow}
                    onCancel={driver.cancelWhileWaiting}
                  />
                </>
              )}

              {isWorking && state.phase !== "retry_wait" && (
                <StageProgress
                  steps={steps}
                  stalled={state.stalled}
                  slowOffer={state.slowOffer}
                  voice={voice}
                  onKeepWaiting={driver.keepWaiting}
                  onTryAgain={() => void driver.retryAfterError()}
                />
              )}

              {(state.phase === "answering" || state.phase === "rating") &&
                turn && (
                  <AnswerCard
                    sentences={turn.sentences}
                    citations={turn.citations}
                    notices={turn.notices}
                    idk={turn.idk}
                    spokenLang={lang}
                    voice={voice}
                    clips={turn.clips}
                    clipsLeft={turn.audioQueue.length}
                    playing={playing}
                    audioFailed={turn.audioFailed}
                    streaming={!turn.done}
                    answerId={turn.answerId}
                    rendition={
                      turn.answerId
                        ? driver.renditions[turn.answerId]
                        : undefined
                    }
                    onReplay={driver.playClips}
                    onRetryAudio={driver.retryAudio}
                    onHearTwi={driver.hearInTwi}
                    footer={
                      !voice && state.phase === "rating" ? (
                        <InlineRating
                          selected={state.rating?.face}
                          onRate={driver.rate}
                          onDone={driver.finishRating}
                          onComment={driver.setRatingComment}
                        />
                      ) : undefined
                    }
                  />
                )}

              {voice && state.phase === "rating" && (
                <RatingCard
                  selected={state.rating?.face}
                  onRate={driver.rate}
                  onSkip={driver.finishRating}
                  onDone={driver.finishRating}
                  onComment={driver.setRatingComment}
                  onHear={() => void play("PR-RAT-01", { force: true })}
                />
              )}

              {state.phase === "clarifying" && turn?.clarify && (
                <ClarifyCard
                  clarify={turn.clarify}
                  mode={lang}
                  voice={voice}
                  onReplay={() => {
                    const url = turn.clarify?.audio_url
                    if (url) void player.playClip(url)
                  }}
                  onReply={(text) =>
                    void driver.sendText(text, {
                      kind: "clarify_answer",
                      source: "quick_reply",
                    })
                  }
                />
              )}

              {state.phase === "fallback_menu" && state.rejectedQuestion && (
                <RejectedBubble question={state.rejectedQuestion} />
              )}

              {state.phase === "fallback_menu" && (
                <FallbackMenu
                  items={state.fallbackItems ?? []}
                  voice={voice}
                  onPick={(item) =>
                    void driver.sendText(item.label_en, {
                      source: "menu",
                      menuItemId: item.id,
                    })
                  }
                  onSpeakAgain={() => void pressRecord()}
                  onTypeInstead={() => session.set({ mode: "english_text" })}
                  onSwitchLanguage={() => setModeSheetOpen(true)}
                />
              )}

              {state.phase === "error" && state.error && (
                <ErrorCard
                  kind={state.error.kind}
                  onAction={() => void driver.retryAfterError()}
                  onDismiss={driver.dismiss}
                />
              )}
            </>
          )}
        </div>
      </main>

      {voice ? (
        <RecordFooter
          state={recordButtonState(state.phase, playing)}
          level={driver.level}
          showHint={state.history.length === 0 && state.phase === "idle"}
          idleLabel={
            state.phase === "await_confirm" || state.phase === "echo_back"
              ? "Tap to ask again"
              : state.phase === "clarifying"
                ? "Tap to answer"
                : undefined
          }
          idleAria={
            state.phase === "clarifying" ? "Answer by voice" : undefined
          }
          onPress={() => void pressRecord()}
        />
      ) : (
        <Composer
          disabled={state.phase === "sending" || state.phase === "retry_wait"}
          onSend={(text) =>
            void driver.sendText(text, {
              source: "typed",
              kind: state.phase === "clarifying" ? "clarify_answer" : undefined,
            })
          }
        />
      )}
    </div>
  )
}
