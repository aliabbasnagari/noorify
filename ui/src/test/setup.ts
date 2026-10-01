import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"
// Vitest isolates each test file's module registry, so react-i18next's
// global singleton is only initialized here if something in that specific
// file's import chain triggers it. Most component tests render a component
// directly (not through App.tsx, which is the only other place this side-
// effecting import happens) — without this, `useTranslation()` runs
// against an uninitialized instance and `t("some.key")` renders the raw
// key string instead of real English text, breaking exact-text assertions
// in any test for a component that calls `t()`.
import "@/i18n"

// jsdom doesn't implement HTMLMediaElement playback (play/pause/load throw
// "Not implemented") — the audio engine singleton constructs a real
// <audio> element at import time, so every test that touches it needs this.
window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
window.HTMLMediaElement.prototype.pause = vi.fn()
window.HTMLMediaElement.prototype.load = vi.fn()

// jsdom doesn't implement matchMedia; next-themes and responsive hooks need it.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

// jsdom doesn't implement ResizeObserver — VirtualizedGrid uses it to
// compute column count from the container's measured width.
if (!window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
