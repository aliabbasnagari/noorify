import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  useInfiniteResourceList,
  useResourceList,
} from '@/hooks/use-resource-list'
import { VirtualizedGrid } from '@/components/library/virtualized-grid'
import { AlbumCard } from '@/components/library/album-card'
import { findHomeShelf, type HomeShelf } from '@/lib/home-shelves'
import type { Album } from '@/lib/api/types'

function Grid({
  albums,
  total,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  albums: Album[]
  total: number
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
}) {
  const { t } = useTranslation()
  return (
    <VirtualizedGrid
      className="min-h-0 flex-1"
      items={albums}
      total={total}
      itemMinWidth={168}
      itemHeight={230}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={onLoadMore}
      renderItem={(album) => <AlbumCard key={album.id} album={album} />}
      emptyMessage={t('albums.emptyMessage')}
    />
  )
}

function PagedShelfGrid({ params }: { params: HomeShelf['params'] }) {
  const {
    items,
    total,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteResourceList<Album>('album', params)
  const { t } = useTranslation()
  if (isLoading)
    return <p className="text-muted-foreground">{t('common.loading')}</p>
  return (
    <Grid
      albums={items}
      total={total}
      hasNextPage={!!hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={() => fetchNextPage()}
    />
  )
}

/** Random order can't be paged (each request reshuffles, so pages would
 * repeat and skip albums) — fetch one fixed batch instead. */
function RandomShelfGrid({ params }: { params: HomeShelf['params'] }) {
  const { t } = useTranslation()
  const { data, isLoading } = useResourceList<Album>('album', {
    ...params,
    end: 100,
  })
  if (isLoading)
    return <p className="text-muted-foreground">{t('common.loading')}</p>
  return (
    <Grid
      albums={data?.data ?? []}
      total={data?.data.length ?? 0}
      hasNextPage={false}
      isFetchingNextPage={false}
      onLoadMore={() => {}}
    />
  )
}

export default function ShelfPage({ shelfId }: { shelfId: string }) {
  const { t } = useTranslation()
  const shelf = findHomeShelf(shelfId)

  if (!shelf)
    return (
      <p className="py-16 text-muted-foreground">{t('home.shelfNotFound')}</p>
    )

  return (
    <div className="flex h-full flex-col gap-4 py-6">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          aria-label={t('home.backToHome')}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold">{t(shelf.titleKey)}</h1>
      </div>
      {shelf.params.sort === 'random' ? (
        <RandomShelfGrid params={shelf.params} />
      ) : (
        <PagedShelfGrid params={shelf.params} />
      )}
    </div>
  )
}
