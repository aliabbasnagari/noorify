/**
 * Transcoding decision service.
 *
 * Fetches per-song transcoding decisions from Navidrome's getTranscodeDecision
 * endpoint, caches them (keyed by songId), and builds the final stream URL.
 *
 * The server returns a JWT-signed `transcodeParams` string that must be forwarded
 * to the `getTranscodeStream` endpoint.  The JWT has an expiry, so cache entries
 * are validated before use.
 */

import { jwtDecode } from 'jwt-decode'
import { detectBrowserProfile, type BrowserProfile } from './browserProfile'
import { getTranscodeDecision, getTranscodeStreamUrl, getStreamUrl } from './subsonic'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TranscodeDecision {
  canDirectPlay: boolean
  /** JWT-signed opaque string; forward as-is to getTranscodeStream. */
  transcodeParams?: string
  transcodeStream?: {
    codec: string
    container: string
    bitRate: number
  } | null
}

interface CacheEntry {
  decision: TranscodeDecision
  /** Epoch seconds when this entry was cached (used if JWT has no exp). */
  cachedAt: number
}

// ─── JWT expiry helper ────────────────────────────────────────────────────────

/** Extract the `exp` claim from a JWT without verifying its signature. */
function decodeJwtExp(token: string): number | null {
  try {
    const payload = jwtDecode<{ exp?: number }>(token)
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

class TranscodeService {
  private cache = new Map<string, CacheEntry>()
  private profile: BrowserProfile | null = null

  // Initialise (or replace) the browser profile used for all requests.
  init(): BrowserProfile {
    this.profile = detectBrowserProfile()
    this.cache.clear()
    return this.profile
  }

  getProfile(): BrowserProfile | null {
    return this.profile
  }

  // ── Cache freshness ────────────────────────────────────────────────────────

  private isFresh(entry: CacheEntry): boolean {
    const params = entry.decision.transcodeParams
    if (!params) {
      // Direct-play decisions have no JWT — consider fresh for 30 minutes.
      return Date.now() - entry.cachedAt * 1000 < 30 * 60 * 1000
    }
    const exp = decodeJwtExp(params)
    if (exp == null) return false
    // 60-second safety buffer avoids using a token that expires mid-request.
    return Date.now() < (exp - 60) * 1000
  }

  // ── Decision fetch + cache ─────────────────────────────────────────────────

  async getDecision(songId: string): Promise<TranscodeDecision | null> {
    if (!this.profile) return null

    const cached = this.cache.get(songId)
    if (cached && this.isFresh(cached)) return cached.decision

    try {
      const decision = await getTranscodeDecision(songId, this.profile)
      this.cache.set(songId, { decision, cachedAt: Math.floor(Date.now() / 1000) })
      return decision
    } catch {
      // If the endpoint fails (e.g. network error), fall back to direct stream.
      return null
    }
  }

  /**
   * Pre-fetch decisions for upcoming songs in the background.
   * Errors are silently ignored — this is a best-effort optimisation.
   */
  prefetch(songIds: string[]): void {
    if (!this.profile) return
    const uncached = songIds.filter((id) => {
      const entry = this.cache.get(id)
      return !entry || !this.isFresh(entry)
    })
    uncached.forEach((id) => this.getDecision(id).catch(() => {}))
  }

  /** Invalidate the entire cache (e.g. when the player profile changes). */
  invalidate(): void {
    this.cache.clear()
  }

  // ── Stream URL resolution ──────────────────────────────────────────────────

  /**
   * Resolve the best stream URL for a song:
   *   1. Ask the server for a transcode decision.
   *   2. If `transcodeParams` is present, use getTranscodeStream.
   *   3. Otherwise fall back to the standard Subsonic stream endpoint.
   */
  async resolveStreamUrl(songId: string, offsetMs?: number): Promise<string> {
    const decision = await this.getDecision(songId)
    if (decision?.transcodeParams) {
      return getTranscodeStreamUrl(songId, decision.transcodeParams, offsetMs)
    }
    return getStreamUrl(songId)
  }
}

// Singleton — created once per page load, re-initialised after login.
export const transcodeService = new TranscodeService()
