# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

"Noorify" is a fork of [Navidrome](https://github.com/navidrome/navidrome) (Go module path is still `github.com/navidrome/navidrome`; Makefile, Docker tags and ldflags still say navidrome). It is a self-hosted music server: Go backend (SQLite, Subsonic/Jellyfin/native APIs, plugin system) plus a React web UI. On the `noorify` branch `ui/` holds the modern frontend and `ui-old/` the legacy one.

## Running commands (important)

Never run build, test, lint, or project run commands yourself (`make ...`, `go build/test`, `npm run build/test/dev/lint`, `npx vitest/playwright`, starting the server, etc.). The user runs them. After finishing a coding task, tell the user which commands need to be run (e.g. `make wire`, `make api-gen`, `make test PKG=./server/...`, `npm test` in `ui/`), and they will paste back the output for you to act on.

## Commands

The Makefile is the entry point (run `make help`). It assumes a POSIX shell (use Git Bash/WSL on Windows). Go build tags `netgo,sqlite_fts5` are required for building and testing — always go through `make` or pass `-tags netgo,sqlite_fts5`.

- `make setup` — install Go deps, golangci-lint, git hooks, and `npm ci` in `ui/`
- `make dev` — backend + UI hot reload (foreman with `Procfile.dev`, port 4533)
- `make server` — backend only with reflex hot-reload (`reflex.conf`)
- `make build` — build the UI (`ui/build`) then the Go binary
- `make test PKG=./server/...` — Go tests for a package (default `./...`); tests use Ginkgo/Gomega
- Single Go test: `go test -tags netgo,sqlite_fts5 ./persistence -run TestPersistence` runs the Ginkgo suite; focus a spec with `-ginkgo.focus="<spec text>"`
- `make test-race`, `make watch` (ginkgo watch), `make test-js`, `make test-i18n`, `make testall`
- `make lint` (golangci-lint), `make lintall` (also JS lint/prettier check), `make format`
- `make pre-push` = `lintall testall` (also what the git hook in `git/` runs)
- `make snapshots` — regenerate Subsonic response snapshot tests (`UPDATE_SNAPSHOTS=true`)
- `make migration-sql name=foo` / `make migration-go name=foo` — new goose migration in `db/migrations`

### Code generation (run after touching the relevant inputs)
- `make wire` — regenerate DI (`cmd/wire_gen.go` from `cmd/wire_injectors.go`; per-package `wire_providers.go` hold providers, e.g. `core/wire_providers.go`)
- `make api-gen` — OpenAPI v1: multi-file spec in `api/openapi/` → bundled in `api/bundled/` → Go server code in `server/apiv1`. `make api-lint` / `make api-diff` check the spec and breaking changes.
- `make gen` — `go generate` plus the `ndpgen` tool (`plugins/cmd/ndpgen`) that generates plugin PDK code (Go/Rust) from `plugins/host`, `plugins/capabilities`, `plugins/types`. Test it with `make test-ndpgen`.

### Frontends
- `ui/` is the active UI: the Go server embeds and serves `ui/build` (`ui/embed.go`, package `ui`, imported as `github.com/navidrome/navidrome/ui` in `server/server.go`). React 19, Vite, TanStack Router/Query/Table, Tailwind 4, shadcn/base-ui, i18next. Scripts (run in `ui/`): `npm run dev`, `npm test` (vitest), `npm run type-check`, `npm run e2e` (Playwright), `npm run lint`, `npm run format`. The Makefile (`buildjs`), `Procfile.dev` and Dockerfile build from it. Its `index.html` is a Go template rendered by `server/serve_index.go` (injects `window.__APP_CONFIG__` / `__SHARE_INFO__`).
- `ui-old/` is the legacy React 17 / react-admin UI. It is no longer built or served; it remains in the tree.

## Architecture

Entry: `main.go` → `cmd/` (cobra commands: root server, scan, user, plugin, backup, doctor, etc.). `cmd/root.go` wires everything via Google Wire and starts long-running services (HTTP server, scanner watcher, scheduler, plugin manager, etc.).

Layers, top to bottom:
- `server/` — HTTP layer. `server.go` builds the chi router and mounts each API: `subsonic/` (Subsonic API, snapshot-tested responses in `subsonic/responses`), `nativeapi/` (REST used by the UI), `apiv1/` (generated OpenAPI server), `jellyfin/`, `public/` (shares, artwork), `events/` (SSE). Auth and shared middleware in `auth.go`/`middlewares.go`; SPA is served through `serve_index.go`.
- `core/` — business logic and services: `agents/` + `external/` (metadata from Last.fm/Deezer/ListenBrainz/Spotify-like providers), `artwork/`, `stream/` + `ffmpeg/` (transcoding), `scrobbler/`, `playlists/`, `lyrics/`, `storage/`, `matcher/`, `playback/`, `auth/`, `metrics/`, `publicurl/`.
- `scanner/` — library scanner, organized as phases (`phase_1_folders` → `phase_2_missing_tracks` → `phase_3_refresh_albums` → `phase_4_playlists`), plus `watcher.go` for filesystem events. See `scanner/README.md`.
- `model/` — domain entities and the repository interfaces (`datastore.go`); also tag/metadata mapping (`metadata/`, `tag_mappings.go`), smart-playlist `criteria/`, and request-context helpers (`request/`).
- `persistence/` — SQL (SQLite via squirrel/dbx-style repositories) implementations of the `model` repositories. `db/` holds connection setup, backup/repair and goose `migrations/` (SQL or Go).
- `adapters/` — concrete external integrations (`gotaglib` tag reader, `lastfm`, `listenbrainz`, `deezer`).
- `plugins/` — WASM plugin system (extism). `host_*.go` expose host services to plugins; `capabilities/` define what plugins can implement; `pdk/` is the generated plugin dev kit; `examples/` are sample plugins. Generated files (`*_gen.go`, `pdk/`) come from `ndpgen` — edit the inputs, not the outputs.
- `conf/` (config via viper; `ND_*` env vars, `navidrome.toml`), `consts/`, `log/`, `scheduler/`, `utils/`, `resources/` (embedded assets and i18n JSON for the server).

## Notes

- `ND_ENABLEINSIGHTSCOLLECTOR=false` is exported by the Makefile; set it when running things manually.
- Tests under `tests/fixtures/` and `plugins/testdata/` include symlinks; on Windows these show as modified/deleted in `git status` due to symlink handling — don't commit those changes.
- Translations live in `resources/i18n` (server) and `ui/src/i18n` (UI) and are validated by `make test-i18n`.
- Contribution conventions (PR template, commit style like `feat(ui): ...` / `fix(scanner): ...`) are in `CONTRIBUTING.md` and `.github/`.
