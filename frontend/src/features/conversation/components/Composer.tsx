/** Text mode composer (mockups/J3 S05-Text): visible label, Send ≥ 64 px, never touches the microphone. */

import { useId, useState } from "react"
import { Icon } from "@/features/shell/Icon"

export function Composer({
  disabled,
  placeholder = "Type your farming question",
  onSend,
}: {
  disabled?: boolean
  placeholder?: string
  onSend: (text: string) => void
}) {
  const [text, setText] = useState("")
  const id = useId()
  const send = () => {
    if (!text.trim() || disabled) return
    onSend(text)
    setText("")
  }
  return (
    <footer className="sticky bottom-0 z-10 flex flex-none justify-center border-t border-line-subtle bg-surface px-4 pt-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:px-6">
      <form
        className="flex w-full max-w-[760px] flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <label htmlFor={id} className="font-ui text-[15px] font-semibold">
          Your question
        </label>
        <div className="flex items-end gap-3">
          <textarea
            id={id}
            rows={2}
            value={text}
            placeholder={placeholder}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            className="min-h-16 min-w-0 flex-1 resize-y rounded-panel border border-line bg-surface px-5 py-4 text-lg"
          />
          <button
            type="submit"
            disabled={disabled || !text.trim()}
            className="inline-flex min-h-16 flex-none items-center gap-2 rounded-full bg-lime px-5 font-ui text-lg font-semibold text-on-lime disabled:opacity-50 sm:px-7"
          >
            Send
            <Icon name="arrow_forward" size={22} />
          </button>
        </div>
      </form>
    </footer>
  )
}
