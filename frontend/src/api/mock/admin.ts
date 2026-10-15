/**
 * Mock of the /v1/admin routes behind the team views (S10, S11). Scores, tags and the rater
 * profile persist in localStorage, like the farmer mock, so a reload keeps the batch position.
 */

import {
  type AdminTurnDetail,
  type AdminTurnSummary,
  ApiError,
  type RaterProfile,
  type RaterScores,
  type TurnTag,
} from "../contract"
import type { SonovaremApi } from "../port"
import {
  LOW_CONFIDENCE,
  operatorTurns,
  RATER_BATCH_SIZE,
  RATER_DONE_AT_START,
  RATER_LABEL,
  raterItems,
} from "./teamFixtures"

const TEAM_KEY = "sv-mock-team"

interface TeamDb {
  profile?: RaterProfile
  scores: Record<string, RaterScores>
  tags: Record<string, TurnTag>
}

function loadTeam(): TeamDb {
  try {
    const raw = localStorage.getItem(TEAM_KEY)
    if (raw) return JSON.parse(raw) as TeamDb
  } catch {
    // start empty
  }
  return { scores: {}, tags: {} }
}

const inRange = (n: unknown) =>
  typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 5

const summary = (t: AdminTurnDetail, tag?: TurnTag): AdminTurnSummary => ({
  id: t.id,
  turn_ref: t.turn_ref,
  topic: t.topic,
  mode: t.mode,
  source: t.source,
  dialect: t.dialect,
  rating: t.rating,
  idk: t.idk,
  asr_confidence: t.asr_confidence,
  label: t.label,
  tag,
  created_at: t.created_at,
})

export function createMockAdmin(
  latency: <T>(value: T, ms?: number) => Promise<T>,
  ensureOnline: () => void,
): SonovaremApi["admin"] {
  const team = loadTeam()
  const items = raterItems()
  const save = () => {
    try {
      localStorage.setItem(TEAM_KEY, JSON.stringify(team))
    } catch {
      // ignore
    }
  }
  const find = (id: string) => {
    const turn = operatorTurns.find((t) => t.id === id)
    if (!turn) throw new ApiError("not_found", false, `No turn ${id}`)
    return turn
  }

  return {
    async raterBatch() {
      ensureOnline()
      const remaining = items
        .slice(RATER_DONE_AT_START)
        .filter((i) => !team.scores[i.id])
      return latency({
        batch_id: "batch-w7-01",
        rater_label: RATER_LABEL,
        total: RATER_BATCH_SIZE,
        done: RATER_BATCH_SIZE - remaining.length,
        items: remaining,
        profile: team.profile,
      })
    },
    async setRaterProfile(profile) {
      ensureOnline()
      team.profile = profile
      save()
      return latency(undefined)
    },
    async scoreItem(itemId, scores) {
      ensureOnline()
      if (!items.some((i) => i.id === itemId))
        throw new ApiError("not_found", false, `No item ${itemId}`)
      const required = [
        scores.relevance,
        scores.correctness,
        scores.groundedness,
      ]
      if (
        !required.every(inRange) ||
        (scores.intelligible !== undefined && !inRange(scores.intelligible))
      )
        throw new ApiError(
          "server",
          false,
          "Scores must be whole numbers 1 to 5",
        )
      team.scores[itemId] = scores
      save()
      return latency(undefined, 200)
    },
    async turns(filters) {
      ensureOnline()
      const flags = filters.low_rating || filters.idk || filters.low_confidence
      const rows = operatorTurns.filter((t) => {
        if (filters.mode && t.mode !== filters.mode) return false
        if (filters.dialect && t.dialect !== filters.dialect) return false
        if (filters.source && t.source !== filters.source) return false
        if (!flags) return true
        return (
          (filters.low_rating && t.rating !== undefined && t.rating >= 2) ||
          (filters.idk && t.idk) ||
          (filters.low_confidence &&
            t.asr_confidence !== undefined &&
            t.asr_confidence < LOW_CONFIDENCE)
        )
      })
      return latency(rows.map((t) => summary(t, team.tags[t.id])))
    },
    async turn(id) {
      ensureOnline()
      return latency({ ...find(id), tag: team.tags[id] })
    },
    async tagTurn(id, tag) {
      ensureOnline()
      find(id)
      const saved: TurnTag = { ...tag, tagged_at: new Date().toISOString() }
      team.tags[id] = saved
      save()
      return latency(saved)
    },
    async exportTagged() {
      ensureOnline()
      return latency(
        operatorTurns
          .filter((t) => team.tags[t.id])
          .map((t) => ({ ...t, tag: team.tags[t.id] })),
      )
    },
  }
}

export function resetMockTeam() {
  try {
    localStorage.removeItem(TEAM_KEY)
  } catch {
    // ignore
  }
}
