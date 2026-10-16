import { describe, expect, it } from 'vitest'
import {
  DEFAULT_VIEW_HOME,
  DEFAULT_VIEW_OPTIONS,
  consumeDefaultViewRedirect,
  resolveDefaultView,
  startsAtRoot,
} from './default-view'

describe('default view', () => {
  it('has unique option ids', () => {
    const ids = DEFAULT_VIEW_OPTIONS.map((o) => o.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('resolves ids and falls back to Home', () => {
    expect(resolveDefaultView('songs').target).toEqual({ to: '/songs' })
    expect(resolveDefaultView('shelf:random').target).toEqual({
      to: '/shelf/$shelfId',
      params: { shelfId: 'random' },
    })
    expect(resolveDefaultView('shelf:gone').id).toBe(DEFAULT_VIEW_HOME)
    expect(resolveDefaultView('').id).toBe(DEFAULT_VIEW_HOME)
  })

  it('only applies when the app starts at the root or login', () => {
    expect(startsAtRoot('')).toBe(true)
    expect(startsAtRoot('#/')).toBe(true)
    expect(startsAtRoot('#/login?redirect=%2F')).toBe(true)
    expect(startsAtRoot('#/albums')).toBe(false)
    expect(startsAtRoot('#/album/abc')).toBe(false)
  })

  it('redirects once per session, never for Home', () => {
    // jsdom starts at no hash, so the first call is eligible.
    expect(consumeDefaultViewRedirect(DEFAULT_VIEW_HOME)).toBeNull()
    // …and that call used up the one-time redirect.
    expect(consumeDefaultViewRedirect('songs')).toBeNull()
  })
})
