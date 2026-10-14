/**
 * S08 Settings (mockups/J3, P1-04 §2.2): grouped lists for mode, memory, recordings and listening,
 * help and privacy, and the account. Every row works in every mode (UP5, UP7).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { type ReactNode, useCallback, useId, useState } from "react"
import { useApi } from "@/api"
import { player } from "@/audio/player"
import { promptText } from "@/audio/prompts"
import { retryBuffer } from "@/audio/retryBuffer"
import { CONSENT_VERSION, RECORDINGS_CONSENT_AVAILABLE } from "@/config/content"
import { ModeSheet } from "@/features/conversation/components/TopBar"
import { usePrompt, usePromptLang } from "@/features/shell/audioHooks"
import { PillButton } from "@/features/shell/buttons"
import { Icon } from "@/features/shell/Icon"
import { modeTitle } from "@/features/shell/ModeCards"
import { PageLayout } from "@/features/shell/PageLayout"
import { Toast } from "@/features/shell/Toast"
import { cn } from "@/lib/utils"
import {
  isVoiceMode,
  type ListeningPrefs,
  session,
  useSession,
} from "@/session/store"

function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5">
      <h2
        id={id}
        className="m-0 ml-2 font-ui text-sm font-semibold text-ink-muted"
      >
        {title}
      </h2>
      <div className="overflow-hidden rounded-card border border-line-subtle bg-surface [&>*+*]:border-t [&>*+*]:border-line-subtle">
        {children}
      </div>
    </section>
  )
}

const rowClass =
  "flex min-h-19 w-full items-center gap-4 bg-surface px-5 py-3 text-left text-ink no-underline sm:px-6"

function RowText({
  title,
  subtitle,
  titleId,
}: {
  title: string
  subtitle?: ReactNode
  titleId?: string
}) {
  return (
    <span className="flex flex-1 flex-col gap-0.5">
      <span id={titleId} className="text-[19px] font-semibold">
        {title}
      </span>
      {subtitle && <span className="text-base text-ink-muted">{subtitle}</span>}
    </span>
  )
}

/** A row that does something when tapped; `trailing` is chevron (opens) or volume_up (speaks). */
function ActionRow({
  icon,
  iconFill,
  title,
  subtitle,
  trailing = "chevron_right",
  expanded,
  danger = false,
  onClick,
}: {
  icon: string
  iconFill?: boolean
  title: string
  subtitle?: ReactNode
  trailing?: "chevron_right" | "volume_up" | "none"
  expanded?: boolean
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onClick}
      className={cn(rowClass, "hover:bg-lime-tint", danger && "text-problem")}
    >
      <Icon
        name={icon}
        fill={iconFill}
        size={28}
        className={cn("flex-none", !danger && "text-brand")}
      />
      <RowText title={title} subtitle={subtitle} />
      {trailing !== "none" && (
        <Icon
          name={
            trailing === "chevron_right" && expanded ? "expand_more" : trailing
          }
          size={26}
          className={trailing === "volume_up" ? "text-brand" : "text-ink-muted"}
        />
      )}
    </button>
  )
}

/** On: brand with a white knob. Off: subtle grey with a border (mockups/J3 S08). */
function SwitchRow({
  icon,
  title,
  subtitle,
  checked,
  disabled,
  onChange,
}: {
  icon: string
  title: string
  subtitle: ReactNode
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}) {
  const titleId = useId()
  return (
    <div className={rowClass}>
      <Icon name={icon} size={28} className="flex-none text-brand" />
      <RowText title={title} subtitle={subtitle} titleId={titleId} />
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={titleId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "box-border flex h-8.5 w-15 flex-none items-center rounded-full p-0.75 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          checked
            ? "justify-end bg-brand"
            : "justify-start border-2 border-line bg-line-subtle p-0.5",
        )}
      >
        <span
          className={cn(
            "rounded-full bg-surface",
            checked ? "size-7" : "size-6.5 shadow-sm",
          )}
        />
      </button>
    </div>
  )
}

const PREF_ROWS: {
  key: keyof ListeningPrefs
  icon: string
  title: string
  subtitle: string
}[] = [
  {
    key: "tapToStop",
    icon: "stop_circle",
    title: "Always wait for me to tap stop",
    subtitle: "I will not stop listening when you pause",
  },
  {
    key: "alwaysConfirm",
    icon: "task_alt",
    title: "Always ask me to confirm my question",
    subtitle: "Wait for my tick before answering",
  },
  {
    key: "noAutoPrompts",
    icon: "volume_off",
    title: "Don't play prompts by themselves",
    subtitle: "Prompts play only when you tap. Useful with a screen reader",
  },
]

export function SettingsScreen() {
  const api = useApi()
  const queryClient = useQueryClient()
  const play = usePrompt()
  const lang = usePromptLang()
  const mode = useSession((s) => s.mode)
  const user = useSession((s) => s.user)
  const memoryConsent = useSession((s) => s.memoryConsent)
  const prefs = useSession((s) => s.prefs)
  const [modeOpen, setModeOpen] = useState(false)
  const [panel, setPanel] = useState<"memory" | "forget" | "consent" | "ask">()
  const [toast, setToast] = useState<string>()
  const hideToast = useCallback(() => setToast(undefined), [])
  const voice = isVoiceMode(mode)

  const confirm = (text: string) => {
    setToast(text)
    if (voice) void player.say(text)
  }
  const toggle = (next: typeof panel) =>
    setPanel((p) => (p === next ? undefined : next))

  const memory = useQuery({
    queryKey: ["memory"],
    queryFn: () => api.memory.list(),
    enabled: !!user && (panel === "memory" || panel === "forget"),
  })

  const consentText = useQuery({
    queryKey: ["consent", mode],
    queryFn: () => api.consent.current(mode ?? "twi_voice"),
    enabled: panel === "consent",
  })

  const setMemory = useMutation({
    mutationFn: async (on: boolean) => {
      if (on) {
        await api.consent.record({
          version: CONSENT_VERSION,
          mode: mode ?? "twi_voice",
          layers: { memory: true },
          method: "tap",
        })
      } else {
        await api.consent.revoke("memory")
      }
      return on
    },
    onSuccess: (on) => {
      session.set({ memoryConsent: on })
      void queryClient.invalidateQueries({ queryKey: ["memory"] })
      confirm(
        on ? "Memory is on." : "Memory is off. I have forgotten what I knew.",
      )
    },
  })

  const forget = useMutation({
    mutationFn: (id?: string) =>
      id ? api.memory.forget(id) : api.memory.forgetAll(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["memory"] })
      confirm(promptText("PR-MEM-03"))
    },
  })

  const setPref = (key: keyof ListeningPrefs, value: boolean) => {
    session.set((s) => ({ prefs: { ...s.prefs, [key]: value } }))
    setToast("Saved.")
  }

  const hearMemory = async () => {
    toggle("memory")
    if (panel === "memory") return
    const items = await queryClient.fetchQuery({
      queryKey: ["memory"],
      queryFn: () => api.memory.list(),
    })
    void player.say(
      items.length
        ? `${promptText("PR-MEM-04")} ${items.map((i) => i.summary_en).join(". ")}.`
        : "I don't remember anything about you.",
    )
  }

  const signOut = async () => {
    await api.auth.logout().catch(() => {})
    await retryBuffer.clear()
    queryClient.clear()
    session.set({ user: undefined, memoryConsent: undefined })
    setPanel(undefined)
    confirm("Signed out of this phone.")
  }

  return (
    <PageLayout title="Settings" icon="settings">
      <Group title="How we talk">
        <ActionRow
          icon={mode === "english_text" ? "menu_book" : "mic"}
          iconFill={mode !== "english_text"}
          title="Language and mode"
          subtitle={mode ? modeTitle(mode) : "Not chosen yet"}
          onClick={() => setModeOpen(true)}
        />
      </Group>
      {mode && (
        <ModeSheet open={modeOpen} onOpenChange={setModeOpen} current={mode} />
      )}

      <Group title="What I remember">
        {user ? (
          <>
            <SwitchRow
              icon="psychology_alt"
              title="Remember our talks and my farm"
              subtitle="So I can help you next time"
              checked={!!memoryConsent}
              disabled={setMemory.isPending}
              onChange={(on) => setMemory.mutate(on)}
            />
            <ActionRow
              icon="record_voice_over"
              title="What do you remember about me?"
              trailing="volume_up"
              expanded={panel === "memory"}
              onClick={() => void hearMemory()}
            />
            {panel === "memory" && (
              <MemoryList items={memory.data} loading={memory.isLoading} />
            )}
            <ActionRow
              icon="auto_delete"
              title="Forget something"
              expanded={panel === "forget"}
              onClick={() => toggle("forget")}
            />
            {panel === "forget" && (
              <MemoryList
                items={memory.data}
                loading={memory.isLoading}
                onForget={(id) => forget.mutate(id)}
              />
            )}
          </>
        ) : (
          <Link to="/sign-in" className={cn(rowClass, "hover:bg-lime-tint")}>
            <Icon
              name="bookmark_add"
              size={28}
              className="flex-none text-brand"
            />
            <RowText
              title="Save me, so I remember you"
              subtitle="I only remember you after you add your phone number"
            />
            <Icon name="chevron_right" size={26} className="text-ink-muted" />
          </Link>
        )}
      </Group>

      <Group title="Recordings and listening">
        <SwitchRow
          icon="graphic_eq"
          title="Keep my voice recordings"
          subtitle={
            RECORDINGS_CONSENT_AVAILABLE
              ? promptText("PR-CON-04")
              : "Off. Recordings are deleted after your answer"
          }
          checked={false}
          disabled={!RECORDINGS_CONSENT_AVAILABLE}
          onChange={() => {}}
        />
        {PREF_ROWS.map((row) => (
          <SwitchRow
            key={row.key}
            icon={row.icon}
            title={row.title}
            subtitle={row.subtitle}
            checked={prefs[row.key]}
            onChange={(on) => setPref(row.key, on)}
          />
        ))}
      </Group>

      <Group title="Help and privacy">
        <ActionRow
          icon="potted_plant"
          title="What can I ask?"
          trailing="volume_up"
          expanded={panel === "ask"}
          onClick={() => {
            toggle("ask")
            void player.playPrompt("PR-ASK-02", lang)
          }}
        />
        {panel === "ask" && (
          <p className="m-0 px-6 py-4 text-lg">{promptText("PR-ASK-02")}</p>
        )}
        <ActionRow
          icon="verified_user"
          title="Hear what you agreed to"
          trailing="volume_up"
          expanded={panel === "consent"}
          onClick={() => {
            toggle("consent")
            void play("PR-CON-01", { force: true })
          }}
        />
        {panel === "consent" && consentText.data && (
          <ul className="m-0 flex list-disc flex-col gap-2 py-4 pr-6 pl-12 text-lg">
            {consentText.data.summary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </Group>

      <Group title="Account">
        {user && (
          <ActionRow
            icon="logout"
            title="Sign out of this phone"
            trailing="none"
            onClick={() => void signOut()}
          />
        )}
        {/* Problem tones, not the mockup's red (OQ-U11; see README) */}
        <Link
          to="/settings/delete"
          className={cn(rowClass, "text-problem hover:bg-problem-bg")}
        >
          <Icon name="delete_forever" size={28} className="flex-none" />
          <RowText
            title="Delete my account"
            subtitle="Removes your number, talks and memory"
          />
          <Icon name="chevron_right" size={26} className="text-ink-muted" />
        </Link>
      </Group>

      <Toast
        message={toast}
        onHide={hideToast}
        className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2"
      />
    </PageLayout>
  )
}

function MemoryList({
  items,
  loading,
  onForget,
}: {
  items?: { id: string; summary_en: string }[]
  loading: boolean
  onForget?: (id: string) => void
}) {
  if (loading) return <p className="m-0 px-6 py-4 text-lg">Loading…</p>
  if (!items?.length)
    return (
      <p className="m-0 px-6 py-4 text-lg text-ink-muted">
        I don't remember anything about you.
      </p>
    )
  return (
    <ul className="m-0 flex list-none flex-col gap-2 bg-sunken px-4 py-4 sm:px-6">
      {items.map((m) => (
        <li
          key={m.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-row bg-surface px-4 py-3"
        >
          <span className="text-lg">{m.summary_en}</span>
          {onForget && (
            <PillButton
              variant="outline-muted"
              icon="auto_delete"
              aria-label={`Forget this: ${m.summary_en}`}
              onClick={() => onForget(m.id)}
            >
              Forget this
            </PillButton>
          )}
        </li>
      ))}
    </ul>
  )
}
