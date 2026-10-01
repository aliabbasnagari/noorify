# Navidrome Web UI Rewrite — Phased Plan

## Context

`old-ui/` (the current react-admin + redux app, ~415 files) has drifted visually and UX-wise from modern listening apps. A fresh app has been scaffolded at `ui/` (Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui "base-nova" + lucide-icons) but is currently just the default Vite starter page — a blank slate. The goal is to design and build a new web client for Navidrome (a self-hosted, Subsonic-API-compatible music server) that adopts Spotify's UI **and** overall UX (not just visuals) as its north star, while covering the same functional ground old-ui does today (admin/settings included), so old-ui can eventually be retired.

Decisions already made (not open for relitigation in this plan):
1. **Visual identity**: near-exact Spotify look — palette, density, type scale, layout patterns — while staying clearly Navidrome-branded (own logo/name).
2. **Scope**: full admin/settings parity (users, libraries, transcoding, players, missing files, plugins, scan/insights) is in scope as first-class milestones, not deferred indefinitely.
3. **Rollout**: big-bang replacement. `ui/` is built and tested in normal local dev (proxying a running navidrome server's `/api` and `/rest`), then cut over by swapping the Go embed wiring once feature-complete. No production side-by-side toggle.

## Backend surface this plan relies on (verified, not assumed)

- **Native REST** (`/api`, react-admin-style `?sort=&order=&filter={}&_start&_end`): album/artist/song/playlist/radio/share/user/player/transcoding/library/missing/plugin/tag/genre/insights/config/queue/scrobble. Home-shelf vocabulary confirmed server-side: `sort=random`, `sort=recently_added`, `filter={"recently_played":true}&sort=play_date`, `sort=play_count`, `filter={"starred":true}&sort=starred_at`, `filter={"has_rating":true}&sort=rating`. `library_id` filter scopes everything to the active library.
- **Auth**: `POST /auth/login` returns a JWT; every authenticated response carries a re-issued token in `X-ND-Authorization` (sliding 48h expiry) that the client must persist. A separate Subsonic salt/token pair is issued at the same time. Reverse-proxy trusted-header auto-login is a distinct, must-support code path.
- **Realtime**: SSE at `GET /api/events?jwt=<token>` (query param, not header — `EventSource` limitation). Events: `serverStart`, `scanStatus`, `refreshResource` (resource→ids, for cache invalidation), `nowPlayingCount`, `keepAlive`. Reconnects after 5s on drop.
- **Subsonic API** (`/rest/*`) is not just for third-party clients — old-ui uses it directly for cover/avatar art (`getCoverArt?id=<prefixed-id>&size=`), audio streaming URLs, scrobbling (`reportPlayback`/`reportPlaybackKeepalive`), star/rating, download, scan trigger, artist/album info enrichment, and lyrics. **The new UI needs both a native-REST client and a Subsonic client.**
- **Theming** is 100% client-side; the server only sends a `defaultTheme` name string.
- Known gaps vs. a Spotify-like Home: no recommendation engine (rule-based shelves only), no per-play history log, `insights` is collector status, not user stats. The plan works within these — no backend changes assumed.

## Explicit v1 scope exclusions (call these out now so they don't resurface mid-build)

- **Community/custom theme system** (old-ui ships ~54 theme files): v1 ships exactly two themes — Dark (Spotify-exact, default) and Light. Theming architecture stays extensible, but only these two ship.
- **Gapless/crossfade playback**: not in old-ui today either, so this isn't a regression. Treated as a post-cutover stretch goal, explicitly spiked (see Phase 1) so the audio-engine API doesn't foreclose it, but not built in v1.
- **PWA/offline support** (old-ui has a navigation service worker): dropped for v1, revisit after cutover.
- **"Made for you" style recommendations**: no backend support exists; v1's Home is entirely the rule-based shelves listed above.

## Architecture decisions

- **Router**: TanStack Router, not React Router. The admin CRUD screens (Phase 7/8) and browse/search filtering all need sort/filter/pagination state that should live in the URL — TanStack Router's typed, validated search params remove a whole class of manual-parsing bugs that 7+ CRUD screens would otherwise repeat.
- **Server state**: TanStack Query, with cache invalidation driven by the SSE `refreshResource` event (map resource name → matching query keys). Requires an explicit fix (Phase 0) for the token-rotation gap: the SSE connection is opened once with a static `?jwt=`, but the token itself rotates on every REST response — the client must periodically tear down and reopen the EventSource with the latest token, or long-lived tabs silently stop receiving events.
- **Client/UI state**: a small Zustand store for player/queue/active-library/UI prefs, with a persistence middleware for volume/theme/active-library in `localStorage`.
- **Forms**: React Hook Form + Zod, using shadcn's form primitives (already scaffolded).
- **Styling**: extend the existing Tailwind v4 + shadcn (base-nova) setup with a Spotify-derived CSS-variable palette (dark default, light second theme) — no new styling framework needed.
- **Testing**: Vitest + React Testing Library for unit/component coverage, Playwright for critical e2e flows (login, browse→play, playlist edit, one admin CRUD screen).
- **i18n**: port old-ui's `src/i18n/*.json` translation catalogs (actively maintained via POEditor — do not lose this contributor workflow) into a react-i18next-based setup; old-ui's i18nProvider was react-admin-specific and doesn't carry over, but the string catalogs are reusable data.
- **Data table primitive**: built in Phase 0 scoped to the **admin CRUD shape** (sortable/filterable/paginated table) only. Browse UI (Phase 2) gets its own grid/list components — forcing both into one generic primitive early is premature abstraction.

## Phases

Each phase lists Goal, Deliverables, and Definition of Done (DoD folds in perf/a11y/i18n hygiene per-phase rather than as a separate end-of-project pass).

### Phase 0 — Foundations [DONE]
**Goal**: everything else needs this; nothing here is Spotify-specific yet.
- Spotify-derived design tokens (dark + light) as CSS variables on top of shadcn's existing token setup; typography scale; spacing/radius scale for the "rounded pill button, bold cover art" look.
- App shell: collapsible left sidebar, top bar, bottom player-bar placeholder, responsive breakpoints.
- TanStack Router set up with route groups for consumer vs. admin surfaces.
- Native-REST client + Subsonic client (auth headers, id-prefix helpers for art/streaming).
- Auth flow: JWT login form, sliding-refresh token persistence, **and** trusted-header/reverse-proxy auto-login path.
- TanStack Query provider wired to the SSE `refreshResource` event, including the reconnect-on-token-rotation fix above.
- Active-library selector in the Zustand store, threaded into Query keys app-wide (so switching libraries invalidates/refetches everything correctly).
- i18n scaffold seeded from old-ui's existing translation JSON.
- Admin-shaped DataTable + form primitives.
- Vitest/RTL + Playwright wired into CI.
- **DoD**: a logged-in shell renders (empty sidebar/content), auth persists across reload, SSE events log to console, `npm run build`/`lint`/`test` all green in CI.

### Phase 1 — Playback Engine & Player Bar [DONE]
**Goal**: the single most load-bearing piece of the app; build and test it against mock/queued data before browse UI exists.
- Audio engine hook (play/pause/seek/volume/queue/shuffle/repeat) over a native `<audio>` element.
- **Spike**: gapless/crossfade feasibility (dual-buffer swap vs. MSE) — document findings, do not implement; confirm the hook's public API won't block adding it later.
- Persistent bottom player bar: art thumbnail, title/artist, transport controls, scrubbable progress, volume, queue/lyrics affordances (Spotify layout).
- Queue side panel (view/reorder/remove upcoming tracks).
- Scrobble reporting via Subsonic `reportPlayback`/`reportPlaybackKeepalive`.
- MediaSession API integration (OS media keys, lock-screen art).
- Keyboard shortcuts (port old-ui's `keyMap` behavior).
- **DoD**: can play a hardcoded track list end-to-end (play/pause/seek/next/prev/volume/shuffle/repeat), scrobbles fire, media keys work, keyboard-navigable.

### Phase 2 — Core Browse & Library [DONE]
**Goal**: the primary "walk in the door" experience.
- Home page shelves using the confirmed sort/filter combos (recently added, recently played, most played, favorites, top rated, random/discovery), horizontal-scroll Spotify-style rows.
- Albums grid, Artists grid, Playlists list, with grid/list view toggle where old-ui had one.
- Sidebar "Your Library" collapsible list with pinning/filtering (Spotify pattern).
- **Spike**: validate list virtualization (e.g. TanStack Virtual) against real large-library `_start/_end` offset pagination — don't assume it "just works" at 50k+ tracks.
- Inline star/love toggle + rating control (reused by every list/detail view from here on).
- **DoD**: Home/Albums/Artists/Playlists all load real data, are keyboard-navigable, code-split per route, large lists stay smooth (validated against a big library, not just a small test one).

### Phase 3 — Detail Pages [DONE]
**Goal**: where users spend the most time once they've clicked into something.
- Album detail: hero section, **spike + build** client-side cover-art color extraction for the dynamic gradient background (this is a signature Spotify visual — needs real design/perf work, not an afterthought: cache extracted color per track/album id, budget the extraction cost per navigation).
- Tracklist with hover-to-play, add-to-queue, add-to-playlist.
- Artist detail: bio, top songs, discography, similar artists (via existing Subsonic `getArtistInfo`/`getSimilarSongs2` — external-agent dependent, degrade gracefully when absent).
- Playlist detail: manual track reorder (drag-and-drop), rename/describe, delete.
- Shared song-row component + right-click/overflow context menu (play, queue, add to playlist, go to album/artist, share, download, rate) used everywhere from here on.
- **DoD**: full navigation loop (Home → Album/Artist/Playlist → play) works with no dead ends; gradient hero doesn't jank on navigation.

### Phase 4 — Smart Playlists, Search & Radio [DONE]
**Goal**: isolate the one genuinely novel (not a port) piece of scope.
- **Smart playlist rule editor**: old-ui has *no* UI for this today — smart playlists are authored via a YAML rule schema read directly by `persistence/smart_playlist_repository.go`. This is net-new UI for an existing backend capability, not a port. Start with a schema-discovery spike (enumerate supported rule fields/operators from the Go repository), then build a rule builder (start with a subset of fields/operators if the full schema is large; expand later).
- Global instant search (debounced, across artists/albums/songs/playlists).
- Internet radio station CRUD.
- **DoD**: a smart playlist created through the UI actually produces the expected track set; search returns results across all resource types; radio stations play.

### Phase 5 — Sharing & Expanded Now Playing [DONE]
**Goal**: two features that don't share chrome with the rest of the app, so they're isolated together.
- Public share player: unauthenticated, chrome-less surface (no sidebar/player-bar shell) for shared links — kept architecturally separate from the authenticated app shell.
- Share link creation/management from the authenticated side (album/playlist/song).
- Full-screen "Now Playing" view: large art, lyrics panel (Subsonic `getLyricsBySongId`), queue.
- **DoD**: a share link works in a fresh incognito session with zero auth; full-screen now-playing shows synced lyrics when available and degrades cleanly when not.

### Phase 6 — Personalization & Responsive Polish [DONE]
**Goal**: close out the consumer-facing surface.
- Theme switcher (Dark/Light, respecting server-sent `defaultTheme` on first load).
- Full i18n string coverage pass (no hardcoded strings left) across Phases 1–5's work.
- Responsive/mobile layout with a Spotify-style bottom tab bar.
- Keyboard-shortcut parity pass against old-ui's full `keyMap`.
- **DoD**: full listening experience usable end-to-end on mobile viewport widths; language switch changes 100% of visible strings; theme switch persists across reload.

### Phase 7 — Admin Suite: Core CRUD [DONE]
**Goal**: structurally depends only on Phase 0 (DataTable/form primitives + auth) — **can start immediately after Phase 0, in parallel with Phases 1–6 if more than one person is working on this.** Sequenced here only for a single-implementer critical path.
- Users management (CRUD, permissions, avatar).
- Libraries management + per-user library assignment (this is the admin-side counterpart to Phase 0's active-library selector).
- Players registry.
- Transcoding profile CRUD.
- **DoD**: an admin can create a user, assign libraries, and define a transcoding profile, all through the UI, matching old-ui's capabilities.

### Phase 8 — Admin Suite: Operational [DONE]
**Goal**: the more bespoke/event-driven admin surfaces, split from Phase 7 because they're UI-shape-different (not plain CRUD tables) and some are conditionally rendered (plugins only if `pluginsEnabled`).
- Missing files review/cleanup.
- Plugins list/enable/configure (admin-only, gated by config).
- Scan trigger + live progress (driven by the `scanStatus` SSE event from Phase 0).
- Server config/insights viewer.
- **DoD**: triggering a scan shows live progress in the UI; missing-files cleanup actually removes entries; plugin toggle reflects real state.

### Phase 9 — Migration Cutover & Hardening
**Goal**: the actual replacement event, once Phases 0–8 are done.
- Feature-parity audit against old-ui's file/feature inventory (walk `old-ui/src/*` domain by domain, confirm no silent drops).
- Cross-browser/mobile QA pass.
- Swap the Go embed wiring (`old-ui/embed.go`-equivalent) to serve `ui/`'s build output; update Makefile/CI/build scripts referencing the old build path.
- Remove `old-ui/` once the new UI has baked in at least one release.
- Update docs/screenshots referencing the old UI.
- **DoD**: `make build` (or equivalent) produces a binary serving the new UI exclusively; old-ui is deleted from the repo; no stale references remain in docs/CI.

## Verification approach (applies across phases)

- Each phase's DoD is checked manually against a real Navidrome instance with a non-trivial library (not just seed/demo data) — `ui/` runs via `npm run dev` with `/api` and `/rest` proxied to a running navidrome server.
- `npm run lint`, `npm run build`, Vitest unit/component suite, and the Playwright critical-path suite must stay green after every phase — wire these into CI starting Phase 0 so regressions surface immediately, not at Phase 9.
- Phase 9's parity audit is the final gate before deleting `old-ui/` — it should be a literal checklist derived from `old-ui/src`'s domain folders (album, artist, playlist, radio, share, user, player, transcoding, library, missing, plugin), each ticked off against the new UI.
