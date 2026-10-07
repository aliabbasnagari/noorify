import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { getOne } from "@/lib/api/http"
import { formatBytes, formatDuration } from "@/lib/format"
import type { SongDetails } from "@/lib/api/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function formatDate(value?: string): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toLocaleString()
}

function gain(value?: number | null): string | undefined {
  return value == null ? undefined : `${value.toFixed(2)} dB`
}

function Row({ label, children }: { label: string; children?: ReactNode }) {
  if (children === undefined || children === null || children === "")
    return null
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words whitespace-pre-line">{children}</dd>
    </div>
  )
}

/** "Get Info": the full tag/technical record for one song (the list rows
 * only carry a handful of fields). Fetches `/api/song/{id}` when opened. */
export function SongInfoDialog({
  songId,
  open,
  onOpenChange,
}: {
  songId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const { data: song, isLoading } = useQuery({
    queryKey: ["song", "detail", songId],
    queryFn: () => getOne<SongDetails>("song", songId),
    enabled: open,
  })
  const label = (key: string) => t(`library.components.songInfo.${key}`)

  const roles = Object.entries(song?.participants ?? {}).filter(
    ([role]) => role !== "artist" && role !== "albumartist",
  )
  const tags = Object.entries(song?.tags ?? {}).filter(
    ([name]) =>
      ![
        "genre",
        "disctotal",
        "tracktotal",
        "releasetype",
        "recordlabel",
        "media",
        "albumversion",
      ].includes(name),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{song?.title ?? label("title")}</DialogTitle>
        </DialogHeader>
        {isLoading || !song ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <dl className="divide-y divide-border">
            <Row label={label("path")}>{song.path}</Row>
            <Row label={label("library")}>{song.libraryName}</Row>
            <Row label={label("album")}>
              <Link
                to="/album/$albumId"
                params={{ albumId: song.albumId }}
                className="hover:underline"
                onClick={() => onOpenChange(false)}
              >
                {song.album}
              </Link>
            </Row>
            <Row label={label("discSubtitle")}>{song.discSubtitle}</Row>
            <Row label={label("albumArtist")}>
              <Link
                to="/artist/$artistId"
                params={{ artistId: song.albumArtistId }}
                className="hover:underline"
                onClick={() => onOpenChange(false)}
              >
                {song.albumArtist}
              </Link>
            </Row>
            <Row label={label("artist")}>
              <Link
                to="/artist/$artistId"
                params={{ artistId: song.artistId }}
                className="hover:underline"
                onClick={() => onOpenChange(false)}
              >
                {song.artist}
              </Link>
            </Row>
            <Row label={label("genre")}>
              {song.genres?.map((g) => g.name).join(" • ") || song.genre}
            </Row>
            <Row label={label("year")}>{song.year || undefined}</Row>
            <Row label={label("trackNumber")}>
              {song.trackNumber
                ? song.discNumber
                  ? `${song.discNumber}-${song.trackNumber}`
                  : song.trackNumber
                : undefined}
            </Row>
            <Row label={label("duration")}>{formatDuration(song.duration)}</Row>
            <Row label={label("compilation")}>
              {song.compilation ? t("common.yes") : undefined}
            </Row>
            <Row label={label("format")}>
              {[song.suffix?.toUpperCase(), song.codec]
                .filter((v, i, a) => v && a.indexOf(v) === i)
                .join(" · ")}
            </Row>
            <Row label={label("bitRate")}>
              {song.bitRate ? `${song.bitRate} kbps` : undefined}
            </Row>
            <Row label={label("bitDepth")}>{song.bitDepth ?? undefined}</Row>
            <Row label={label("sampleRate")}>
              {song.sampleRate ? `${song.sampleRate} Hz` : undefined}
            </Row>
            <Row label={label("channels")}>{song.channels || undefined}</Row>
            <Row label={label("size")}>{formatBytes(song.size)}</Row>
            <Row label={label("bpm")}>{song.bpm ?? undefined}</Row>
            <Row label={label("playCount")}>{song.playCount ?? 0}</Row>
            <Row label={label("lastPlayed")}>
              {song.playCount ? formatDate(song.playDate) : undefined}
            </Row>
            <Row label={label("updatedAt")}>{formatDate(song.updatedAt)}</Row>
            <Row label={label("albumGain")}>{gain(song.rgAlbumGain)}</Row>
            <Row label={label("trackGain")}>{gain(song.rgTrackGain)}</Row>
            <Row label={label("comment")}>{song.comment}</Row>
            {roles.map(([role, people]) => (
              <Row key={role} label={role}>
                {people.map((p) => p.name).join(" • ")}
              </Row>
            ))}
            {tags.length > 0 && (
              <div className="py-2">
                <h4 className="pb-1 text-sm font-semibold">{label("tags")}</h4>
                {tags.map(([name, values]) => (
                  <Row key={name} label={name}>
                    {values.join(" • ")}
                  </Row>
                ))}
              </div>
            )}
          </dl>
        )}
      </DialogContent>
    </Dialog>
  )
}
