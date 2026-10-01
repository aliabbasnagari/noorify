import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useUiStore } from "@/stores/ui-store"

const SHORTCUTS: { labelKey: string; keys: string }[] = [
  { labelKey: "help.togglePlay", keys: "Space" },
  { labelKey: "help.previous", keys: "←" },
  { labelKey: "help.next", keys: "→" },
  { labelKey: "help.currentSong", keys: "Shift+C" },
  { labelKey: "help.volumeUp", keys: "+" },
  { labelKey: "help.volumeDown", keys: "-" },
  { labelKey: "help.toggleLove", keys: "L" },
  { labelKey: "help.toggleMenu", keys: "M" },
  { labelKey: "help.showHelp", keys: "Shift+?" },
]

export function HelpDialog() {
  const { t } = useTranslation()
  const open = useUiStore((s) => s.helpDialogOpen)
  const setOpen = useUiStore((s) => s.setHelpDialogOpen)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("help.title")}</DialogTitle>
        </DialogHeader>
        <dl className="space-y-2">
          {SHORTCUTS.map(({ labelKey, keys }) => (
            <div key={labelKey} className="flex items-center justify-between gap-4">
              <dt className="text-sm text-muted-foreground">{t(labelKey)}</dt>
              <dd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">
                {keys}
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  )
}
