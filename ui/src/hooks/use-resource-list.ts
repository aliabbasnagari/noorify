import { useQuery, useInfiniteQuery } from "@tanstack/react-query"
import { getList, type ListParams } from "@/lib/api/http"

/**
 * Bounded list (Home shelves: ~20 items, no virtualization needed). Query
 * keys start with `resource` so the SSE `refreshResource` handler
 * (src/lib/realtime/event-stream.ts) invalidates it as a prefix match.
 */
export function useResourceList<T>(resource: string, params: ListParams) {
  return useQuery({
    queryKey: [resource, "list", params],
    queryFn: () => getList<T>(resource, params),
  })
}

const PAGE_SIZE = 60

/**
 * Paginated variant for virtualized grids/lists (Albums/Artists browse).
 * Fetches PAGE_SIZE-row windows via the native REST `_start`/`_end` params
 * as the virtualizer scrolls further, rather than loading a whole (possibly
 * 50k+ row) library up front.
 */
export function useInfiniteResourceList<T>(
  resource: string,
  params: Omit<ListParams, "start" | "end">,
) {
  const query = useInfiniteQuery({
    queryKey: [resource, "list", "infinite", params],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      getList<T>(resource, {
        ...params,
        start: pageParam,
        end: pageParam + PAGE_SIZE,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.data.length, 0)
      return loaded < lastPage.total ? loaded : undefined
    },
  })

  const items = query.data?.pages.flatMap((page) => page.data) ?? []
  const total = query.data?.pages[0]?.total ?? 0

  return { ...query, items, total }
}
