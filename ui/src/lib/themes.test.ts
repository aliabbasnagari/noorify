import { describe, expect, it } from 'vitest'
import { isDarkTheme, themeFromConfig } from './themes'

describe('themes', () => {
  it('knows which themes are dark', () => {
    expect(isDarkTheme('dark')).toBe(true)
    expect(isDarkTheme('solarized-dark')).toBe(true)
    expect(isDarkTheme('light')).toBe(false)
    expect(isDarkTheme('solarized-light')).toBe(false)
    expect(isDarkTheme(undefined)).toBe(false)
  })

  it('maps the server defaultTheme onto a registered id', () => {
    expect(themeFromConfig('Light')).toBe('light')
    expect(themeFromConfig('Solarized Dark')).toBe('solarized-dark')
    expect(themeFromConfig('Solarized Light')).toBe('solarized-light')
    expect(themeFromConfig('Dracula')).toBe('dark')
    expect(themeFromConfig('')).toBe('dark')
    expect(themeFromConfig(undefined)).toBe('dark')
  })
})
