import { useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { cn } from "cn"
import { getLyricsBySongId } from "@/lib/api/subsonic"
import { currentLineIndex } from "@/lib/lyrics-sync"
import { usePlayerStore } from "@/stores/player-store"

export function LyricsPanel({ songId }: { songId: string }) {
  const { t } = useTranslation()
  const currentTime = usePlayerStore((s) => s.currentTime)
  const activeLineRef = useRef<HTMLParagraphElement>(null)

  const { data: lyric, isLoading } = useQuery({
    queryKey: ["lyrics", songId],
    queryFn: () => getLyricsBySongId(songId),
  })

  const synced = !!lyric?.synced
  const activeIndex = synced
    ? currentLineIndex(lyric.line, lyric.offset ?? 0, currentTime)
    : -1

  useEffect(() => {
    activeLineRef.current?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    })
  }, [activeIndex])

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("player.lyrics.loading")}
      </p>
    )
  }

  if (!lyric || lyric.line.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("player.lyrics.empty")}
      </p>
    )
  }

  return (
    <div className="flex max-h-full flex-col gap-3 overflow-y-auto py-4">
      {lyric.line.map((line, index) => (
        <p
          key={index}
          ref={index === activeIndex ? activeLineRef : undefined}
          className={cn(
            "text-lg font-semibold transition-colors",
            synced
              ? index === activeIndex
                ? "text-foreground"
                : "text-muted-foreground/50"
              : "text-foreground",
          )}
        >
          {line.value || " "}
        </p>
      ))}
    </div>
  )
}
