/** CSV export of tagged turns for WP27 (P1-04 S11). */

import type { AdminTurnDetail } from "@/api/contract"

const CSV_COLUMNS: [string, (t: AdminTurnDetail) => unknown][] = [
  ["turn", (t) => t.turn_ref],
  ["topic", (t) => t.topic],
  ["mode", (t) => t.mode],
  ["source", (t) => t.source],
  ["dialect", (t) => t.dialect],
  ["rating", (t) => t.rating],
  ["idk", (t) => t.idk],
  ["asr_confidence", (t) => t.asr_confidence],
  ["reason", (t) => t.tag?.reason],
  ["note", (t) => t.tag?.note],
  ["tagged_at", (t) => t.tag?.tagged_at],
  ["transcript", (t) => t.transcript],
  ["pivot_en", (t) => t.pivot_en],
  ["answer_en", (t) => t.answer_en],
]

export function toCsv(rows: AdminTurnDetail[]): string {
  const cell = (v: unknown) => {
    const s = v === undefined || v === null ? "" : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [
    CSV_COLUMNS.map(([name]) => name).join(","),
    ...rows.map((r) => CSV_COLUMNS.map(([, get]) => cell(get(r))).join(",")),
  ].join("\n")
}

export function downloadCsv(rows: AdminTurnDetail[]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `sonovarem-tagged-turns-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
