import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useResourceList } from '@/hooks/use-resource-list'
import { Shelf } from '@/components/library/shelf'
import { AlbumCard } from '@/components/library/album-card'
import { HOME_SHELVES, type HomeShelf } from '@/lib/home-shelves'
import type { Album } from '@/lib/api/types'

// More than any row can show (6 columns at ~1000px, ~10 on ultrawide);
// the Shelf trims to what fits.
const SHELF_SIZE = 12

function AlbumShelf({ id, titleKey, params }: HomeShelf) {
  const { t } = useTranslation()
  const { data, isLoading } = useResourceList<Album>('album', {
    ...params,
    end: SHELF_SIZE,
  })
  return (
    <Shelf
      title={t(titleKey)}
      items={data?.data ?? []}
      isLoading={isLoading}
      renderItem={(album) => <AlbumCard album={album} />}
      action={
        <Link
          to="/shelf/$shelfId"
          params={{ shelfId: id }}
          className="text-sm font-semibold text-muted-foreground hover:text-foreground hover:underline"
        >
          {t('home.showAll')}
        </Link>
      }
    />
  )
}

export default function HomePage() {
  const { t } = useTranslation()
  return (
    <div className="space-y-8 py-8">
      <h1 className="text-2xl font-bold">{t('home.title')}</h1>
      {HOME_SHELVES.map((shelf) => (
        <AlbumShelf key={shelf.id} {...shelf} />
      ))}
    </div>
  )
}
