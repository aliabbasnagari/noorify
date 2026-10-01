import { LayoutGrid, List } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { useUiStore, type AlbumsViewMode } from "@/stores/ui-store"

export function ViewToggle() {
  const { t } = useTranslation()
  const viewMode = useUiStore((s) => s.albumsViewMode)
  const setViewMode = useUiStore((s) => s.setAlbumsViewMode)

  const options: {
    mode: AlbumsViewMode
    icon: typeof LayoutGrid
    label: string
  }[] = [
    {
      mode: "grid",
      icon: LayoutGrid,
      label: t("library.components.viewToggle.gridView"),
    },
    {
      mode: "list",
      icon: List,
      label: t("library.components.viewToggle.listView"),
    },
  ]

  return (
    <div className="flex items-center gap-0.5 rounded-md bg-muted p-0.5">
      {options.map(({ mode, icon: Icon, label }) => (
        <Button
          key={mode}
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={viewMode === mode}
          className={cn(viewMode === mode && "bg-background shadow-sm")}
          onClick={() => setViewMode(mode)}
        >
          <Icon className="size-4" />
        </Button>
      ))}
    </div>
  )
}
