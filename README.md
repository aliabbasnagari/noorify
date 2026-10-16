<a href="https://www.navidrome.org"><img src="resources/logo-192x192.png" alt="Navidrome logo" title="navidrome" align="right" height="60px" /></a>

# Noorify Music Server &nbsp;[![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)](https://twitter.com/intent/tweet?text=Tired%20of%20paying%20for%20music%20subscriptions%2C%20and%20not%20finding%20what%20you%20really%20like%3F%20Roll%20your%20own%20streaming%20service%21&url=https://navidrome.org&via=navidrome)

[![Last Release](https://img.shields.io/github/v/release/aliabbasnagari/noorify?logo=github&label=latest&style=flat-square)](https://github.com/aliabbasnagari/noorify/releases)
[![Build](https://img.shields.io/github/actions/workflow/status/aliabbasnagari/noorify/pipeline.yml?branch=master&logo=github&style=flat-square)](https://nightly.link/aliabbasnagari/noorify/workflows/pipeline/master)
[![Downloads](https://img.shields.io/github/downloads/aliabbasnagari/noorify/total?logo=github&style=flat-square)](https://github.com/aliabbasnagari/noorify/releases/latest)
[![Docker Pulls](https://img.shields.io/docker/pulls/aliabbasnagari/noorify?logo=docker&label=pulls&style=flat-square)](https://hub.docker.com/r/aliabbasnagari/noorify)

**Noorify** is an open source, self-hosted music server and streamer with a completely redesigned web interface.
It is a fork of [Navidrome](https://www.navidrome.org): the server, scanner, transcoding and Subsonic-compatible API
are upstream Navidrome, and Noorify replaces the web UI with a new React + TypeScript one. Listen to your music
collection from any browser or mobile device. It's like your personal Spotify!

<p align="center">
    <img height="550" src="https://raw.githubusercontent.com/aliabbasnagari/noorify/refs/heads/master/.github/screenshots/ss-desktop-player.png">
</p>

<p align="center">
    <img height="480" src="https://raw.githubusercontent.com/aliabbasnagari/noorify/refs/heads/master/.github/screenshots/ss-mobile-login.png">
    <img height="480" src="https://raw.githubusercontent.com/aliabbasnagari/noorify/refs/heads/master/.github/screenshots/ss-mobile-player.png">
    <img height="480" src="https://raw.githubusercontent.com/aliabbasnagari/noorify/refs/heads/master/.github/screenshots/ss-mobile-album-view.png">
</p>

## Thanks to Navidrome

Noorify exists because of [Navidrome](https://github.com/navidrome/navidrome) and its creator
[Deluan Quintão](https://github.com/deluan) and contributors. All of the backend is their work, released under the
GPL-3.0 license, and Noorify keeps that license. Please consider supporting the original project, and report
server-side bugs upstream. Noorify is not affiliated with or endorsed by the Navidrome project.

**Scope**: Noorify is a UI redesign only. The Go backend is left untouched and treated as a fixed API, so it stays
compatible with upstream Navidrome.

**Note**: The `master` branch may be in an unstable or even broken state during development.

## Noorify UI vs the legacy Navidrome UI

|               | Noorify (`ui/`)                                                                       | Legacy Navidrome UI (`ui-old/`)                              |
| ------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Framework     | React 19 + TypeScript                                                                 | React 17 + JavaScript (JSX)                                  |
| UI toolkit    | shadcn-style components on Base UI, Tailwind CSS 4                                    | react-admin 3 + Material UI                                  |
| Routing       | TanStack Router (hash history, one file per route)                                    | react-admin / react-router                                   |
| Data fetching | TanStack Query                                                                        | react-admin data provider                                    |
| State         | Zustand stores (auth, player, library, scan status, UI)                               | Redux                                                        |
| Tables        | TanStack Table + virtualized lists                                                    | react-admin lists                                            |
| Theming       | Dark (default) and Light, plus the Solarized pair; server-configured default theme    | 32 theme files, including Catppuccin, Dracula, Nord and more |
| Playback      | Custom audio engine, queue panel, synced queue, lyrics panel, hotkeys                 | Audio player component, hotkeys                              |
| Admin         | Dedicated pages for users, libraries, players, transcoding, plugins and missing files | Admin resources inside react-admin                           |
| Other pages   | Home, search, radio, shares, smart-playlist editor                                    | Equivalent react-admin views                                 |
| Offline       | Service worker (Workbox)                                                              | Service worker (Workbox)                                     |
| Tests         | Vitest + Testing Library, Playwright e2e                                              | Vitest + Testing Library                                     |
| Build tooling | TypeScript 6, Vite 8                                                                  | Vite 7                                                       |
| Backend       | Unchanged upstream Navidrome API                                                      | Unchanged upstream Navidrome API                             |

Both UIs talk to the same backend through the Subsonic and native REST APIs, so you can switch between them without
touching your library or data. The legacy theme library is the main thing the new UI doesn't match yet.

## [Try the upstream Navidrome demo](https://www.navidrome.org/demo/)

The demo runs the original Navidrome UI; the server underneath is the same.

**Feedback is welcome!** For anything about the Noorify UI, please file a
[GitHub issue](https://github.com/aliabbasnagari/noorify/issues). For server, API or backend questions, the
upstream [Navidrome issues](https://github.com/navidrome/navidrome/issues), [Subreddit](https://www.reddit.com/r/navidrome/)
and [Discord server](https://discord.gg/xh7j7yF) are the right places.

## Installation

Noorify is built like Navidrome. To build from source, see `make help`; `make dev` runs the backend and the UI with hot reload, and `make build` builds the UI and embeds it in the binary. Server setup, configuration and Docker instructions are the same as upstream's, see the
[Navidrome installation docs](https://www.navidrome.org/docs/installation/).

## Cloud Hosting

Several cloud hosting providers partner with the upstream Navidrome project to offer [officially supported, cloud-hosted solutions](https://www.navidrome.org/docs/installation/managed). If you sign up with any of these providers, a share of the revenue funds the development of Navidrome (not Noorify) at no additional cost for you.

<a href="https://www.pikapods.com/pods?run=navidrome"><img src="resources/hosting/pikapods.svg" alt="Run on PikaPods" width="200" height="40"></a>
<br>
<a href="https://zenith.hosting/host/navidrome?ref=navidrome"><img src="resources/hosting/zenith.svg" alt="Deploy with Zenith" width="200" height="40"></a>
<br>
<a href="https://store.elfhosted.com/product/navidrome/"><img src="resources/hosting/elfhosted.svg" alt="Deploy on ElfHosted" width="200" height="40"></a>

## Features

- Handles very **large music collections**
- Streams virtually **any audio format** available
- Reads and uses all your beautifully curated **metadata**
- Great support for **compilations** (Various Artists albums) and **box sets** (multi-disc albums)
- **Multi-user**, each user has their own play counts, playlists, favourites, etc...
- Very **low resource usage**
- **Multi-platform**, runs on macOS, Linux and Windows. **Docker** images are also provided
- Ready to use binaries for all major platforms, including **Raspberry Pi**
- Automatically **monitors your library** for changes, importing new files and reloading new metadata
- Supports **lyrics** from sidecar .ttml, .yaml/.yml Lyricsfile, .elrc, .lrc, .srt, .txt files and embedded TTML, Enhanced LRC, LRC, SRT, and plain-text tags (via `lyricspriority`)
- Modern, responsive **Noorify web interface** built with React, TypeScript and Tailwind (see the [comparison](#noorify-ui-vs-the-legacy-navidrome-ui))
- **Compatible** with all Subsonic/Madsonic/Airsonic [clients](https://www.navidrome.org/docs/overview/#apps)
- **Transcoding** on the fly. Can be set per user/player. **Opus encoding is supported**
- Translated to **various languages**

## Translations

Navidrome (and so Noorify) uses [POEditor](https://poeditor.com/) for translations, and we are always looking
for [more contributors](https://www.navidrome.org/docs/developers/translations/)

<a href="https://poeditor.com/"> 
<img height="32" src="https://github.com/user-attachments/assets/c19b1d2b-01e1-4682-a007-12356c42147c">
</a>

## Documentation

Server documentation is maintained by the upstream project: https://www.navidrome.org/docs.
Here are some useful direct links:

- [Overview](https://www.navidrome.org/docs/overview/)
- [Installation](https://www.navidrome.org/docs/installation/)
  - [Docker](https://www.navidrome.org/docs/installation/docker/)
  - [Binaries](https://www.navidrome.org/docs/installation/pre-built-binaries/)
  - [Build from source](https://www.navidrome.org/docs/installation/build-from-source/)
- [Development](https://www.navidrome.org/docs/developers/)
- [Subsonic API Compatibility](https://www.navidrome.org/docs/developers/subsonic-api/)
