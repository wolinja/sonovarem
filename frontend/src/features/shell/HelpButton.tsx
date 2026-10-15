import { useState } from "react"
import { promptText } from "@/audio/prompts"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { usePrompt } from "./audioHooks"
import { CircleButton, PillButton } from "./buttons"

/** Same top-bar place on every screen (WCAG 3.2.6). Opening it speaks PR-HLP-01. */
export function HelpButton() {
  const [open, setOpen] = useState(false)
  const play = usePrompt()
  return (
    <>
      <CircleButton
        icon="help"
        aria-label="Help"
        onClick={() => {
          setOpen(true)
          void play("PR-HLP-01", { force: true })
        }}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="rounded-card border-line-subtle bg-surface p-8"
        >
          <DialogTitle className="text-2xl font-bold">
            How to use Sonovarem
          </DialogTitle>
          <DialogDescription className="text-lg leading-relaxed text-ink-muted">
            {promptText("PR-HLP-01")}
          </DialogDescription>
          <div className="flex flex-wrap gap-3">
            <PillButton
              icon="replay"
              onClick={() => void play("PR-HLP-01", { force: true })}
            >
              Hear again
            </PillButton>
            <PillButton variant="primary" onClick={() => setOpen(false)}>
              Close
            </PillButton>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
