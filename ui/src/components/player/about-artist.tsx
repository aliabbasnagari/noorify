import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PanelCard } from '@/components/player/panel-card'
import { getOne } from '@/lib/api/http'
import { getCoverArtUrl } from '@/lib/api/subsonic'
import type { Artist } from '@/lib/api/types'
import type { QueuedTrack } from '@/stores/player-store'

export function AboutArtist({ track }: { track: QueuedTrack }) {
  const { t } = useTranslation()
  const artistId = track.artistId ?? track.artists?.[0]?.id
  const { data: artist } = useQuery({
    queryKey: ['artist', 'detail', artistId],
    queryFn: () => getOne<Artist>('artist', artistId!),
    enabled: !!artistId,
  })
  if (!artistId || track.isRadio) return null

  const biography = artist?.biography?.replace(/<[^>]*>/g, '').trim()
  return (
    <PanelCard title={t('nowPlaying.aboutArtist')} compact>
      <div className="flex items-start gap-4">
        <Link to="/artist/$artistId" params={{ artistId }} className="shrink-0">
          <img
            src={getCoverArtUrl(artistId, 'ar', 160)}
            alt=""
            draggable={false}
            className="size-16 rounded-full object-cover"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to="/artist/$artistId"
            params={{ artistId }}
            className="block truncate font-bold hover:underline"
          >
            {artist?.name ?? track.artist}
          </Link>
          <p className="mt-1 line-clamp-4 text-sm text-muted-foreground">
            {biography || t('nowPlaying.noBiography')}
          </p>
        </div>
      </div>
    </PanelCard>
  )
}
