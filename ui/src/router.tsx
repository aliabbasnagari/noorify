import { createHashHistory, createRouter } from "@tanstack/react-router"
import { ErrorScreen, NotFoundScreen } from "@/components/error-screen"
import { rootRoute } from "@/routes/root"
import { authenticatedRoute } from "@/routes/authenticated"
import { loginRoute } from "@/routes/login"
import { homeRoute } from "@/routes/home"
import { searchRoute } from "@/routes/search"
import { albumsRoute } from "@/routes/albums"
import { artistsRoute } from "@/routes/artists"
import { songsRoute } from "@/routes/songs"
import { radioRoute } from "@/routes/radio"
import { libraryRoute } from "@/routes/library"
import { playlistsRoute } from "@/routes/playlists"
import { albumDetailRoute } from "@/routes/album-detail"
import { artistDetailRoute } from "@/routes/artist-detail"
import { playlistDetailRoute } from "@/routes/playlist-detail"
import { smartPlaylistNewRoute } from "@/routes/smart-playlist-new"
import { smartPlaylistEditRoute } from "@/routes/smart-playlist-edit"
import { sharesRoute } from "@/routes/shares"
import { nowPlayingRoute } from "@/routes/now-playing"
import { adminLayoutRoute } from "@/routes/admin/layout"
import { adminIndexRoute } from "@/routes/admin"
import { adminUsersRoute } from "@/routes/admin/users"
import { adminLibrariesRoute } from "@/routes/admin/libraries"
import { adminPlayersRoute } from "@/routes/admin/players"
import { adminTranscodingRoute } from "@/routes/admin/transcoding"
import { adminMissingFilesRoute } from "@/routes/admin/missing-files"
import { adminPluginsRoute } from "@/routes/admin/plugins"
import { adminPluginDetailRoute } from "@/routes/admin/plugin-detail"

const routeTree = rootRoute.addChildren([
  loginRoute,
  authenticatedRoute.addChildren([
    homeRoute,
    searchRoute,
    albumsRoute,
    artistsRoute,
    songsRoute,
    radioRoute,
    libraryRoute,
    playlistsRoute,
    albumDetailRoute,
    artistDetailRoute,
    playlistDetailRoute,
    smartPlaylistNewRoute,
    smartPlaylistEditRoute,
    sharesRoute,
    nowPlayingRoute,
    adminLayoutRoute.addChildren([
      adminIndexRoute,
      adminUsersRoute,
      adminLibrariesRoute,
      adminPlayersRoute,
      adminTranscodingRoute,
      adminMissingFilesRoute,
      adminPluginsRoute,
      adminPluginDetailRoute,
    ]),
  ]),
])

// Hash history, not browser history: `vite.config.ts`'s `base: "./"` (needed
// so the built assets work when reverse-proxied under an arbitrary
// sub-path, and when embedded into the Go binary and served via a plain
// static file server with no SPA-fallback routing) means relative asset
// URLs resolve against whatever *actual* browser path is loaded. A hard
// reload or deep link to e.g. /playlist/1 would then request
// /playlist/1/assets/*, which 404s. Hash history keeps the real requested
// path at "/" always, with routing state confined to the URL fragment —
// the same approach old-ui used (`history`'s `createHashHistory`).
export const router = createRouter({
  routeTree,
  history: createHashHistory(),
  defaultErrorComponent: ({ error, reset }) => (
    <ErrorScreen error={error} onRetry={reset} />
  ),
  defaultNotFoundComponent: NotFoundScreen,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
