import { afterEach, describe, expect, it } from "vitest"
import { config } from "@/lib/config"
import {
  shareCoverUrl,
  shareDownloadUrl,
  shareLinkUrl,
  shareStreamUrl,
} from "./share-url"

describe("share-url", () => {
  afterEach(() => {
    config.shareURL = ""
    config.baseURL = ""
    config.publicBaseUrl = "/share"
  })

  it("builds URLs off the app's own origin when shareURL is unset", () => {
    config.shareURL = ""
    config.baseURL = ""
    expect(shareLinkUrl("abc123")).toBe(
      `${window.location.origin}/share/abc123`,
    )
    expect(shareStreamUrl("tok")).toBe(`${window.location.origin}/share/s/tok`)
    expect(shareDownloadUrl("abc123")).toBe(
      `${window.location.origin}/share/d/abc123`,
    )
  })

  it("includes the app's reverse-proxy base path when set", () => {
    config.baseURL = "/music"
    expect(shareLinkUrl("abc123")).toBe(
      `${window.location.origin}/music/share/abc123`,
    )
  })

  it("prefers an absolute shareURL override when configured", () => {
    config.shareURL = "https://share.example.com"
    config.baseURL = "/music"
    // baseURL is ignored once shareURL is set — it replaces the whole origin.
    expect(shareLinkUrl("abc123")).toBe(
      "https://share.example.com/share/abc123",
    )
  })

  it("defaults size to 300 and appends it as a query param on cover URLs", () => {
    expect(shareCoverUrl("tok")).toBe(
      `${window.location.origin}/share/img/tok?size=300`,
    )
    expect(shareCoverUrl("tok", 96)).toBe(
      `${window.location.origin}/share/img/tok?size=96`,
    )
  })
})
