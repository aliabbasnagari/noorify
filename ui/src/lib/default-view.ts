import { HOME_SHELVES } from '@/lib/home-shelves'

export const DEFAULT_VIEW_HOME = 'home'

const SHELF_PREFIX = 'shelf:'

/** Where a default-view choice sends the user. */
export type DefaultViewTarget =
  | {
      to:
        | '/'
        | '/albums'
        | '/artists'
        | '/songs'
        | '/playlists'
        | '/radio'
        | '/library'
    }
  | { to: '/shelf/$shelfId'; params: { shelfId: string } }

export interface DefaultViewOption {
  id: string
  /** i18n key for the label; reuses the nav/home strings. */
  labelKey: string
  target: DefaultViewTarget
}

export const DEFAULT_VIEW_OPTIONS: DefaultViewOption[] = [
  { id: DEFAULT_VIEW_HOME, labelKey: 'nav.home', target: { to: '/' } },
  ...HOME_SHELVES.map((shelf): DefaultViewOption => ({
    id: SHELF_PREFIX + shelf.id,
    labelKey: shelf.titleKey,
    target: { to: '/shelf/$shelfId', params: { shelfId: shelf.id } },
  })),
  { id: 'albums', labelKey: 'nav.albums', target: { to: '/albums' } },
  { id: 'artists', labelKey: 'nav.artists', target: { to: '/artists' } },
  { id: 'songs', labelKey: 'nav.songs', target: { to: '/songs' } },
  {
    id: 'playlists',
    labelKey: 'playlists.playlists',
    target: { to: '/playlists' },
  },
  { id: 'radio', labelKey: 'nav.radio', target: { to: '/radio' } },
  { id: 'library', labelKey: 'nav.library', target: { to: '/library' } },
]

/** An unknown id (a shelf that no longer exists, a stale stored value)
 * falls back to Home. */
export function resolveDefaultView(id: string): DefaultViewOption {
  return (
    DEFAULT_VIEW_OPTIONS.find((option) => option.id === id) ??
    DEFAULT_VIEW_OPTIONS[0]
  )
}

/**
 * The default view only applies to the first visit to "/" in a session — the
 * app's own "Home" links must keep going Home. A deep link to any other page
 * (the login screen aside, since signing in lands on "/") means the user
 * already chose where to be.
 */
export function startsAtRoot(hash: string): boolean {
  const path = hash.replace(/^#/, '').split('?')[0]
  return path === '' || path === '/' || path === '/login'
}

let pending = startsAtRoot(window.location.hash)

/** Redirect target for the home route's `beforeLoad`, or null when the
 * default view doesn't apply (already used, deep-linked, or set to Home). */
export function consumeDefaultViewRedirect(
  viewId: string,
): DefaultViewTarget | null {
  if (!pending) return null
  pending = false
  const { target } = resolveDefaultView(viewId)
  return target.to === '/' ? null : target
}
