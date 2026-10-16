import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_VIEW_HOME } from '@/lib/default-view'

export type ReplayGainMode = 'none' | 'album' | 'track'

export const REPLAY_GAIN_PREAMP_MIN = -15
export const REPLAY_GAIN_PREAMP_MAX = 15

interface SettingsState {
  /** Where "/" lands on a fresh app load — see lib/default-view.ts. */
  defaultView: string
  setDefaultView: (view: string) => void
  replayGainMode: ReplayGainMode
  setReplayGainMode: (mode: ReplayGainMode) => void
  /** dB added to the ReplayGain value before it's applied. */
  replayGainPreAmp: number
  setReplayGainPreAmp: (preAmp: number) => void
  /** Desktop notification on track change. Only effective while the browser
   * has granted notification permission (see lib/notifications.ts). */
  notifications: boolean
  setNotifications: (enabled: boolean) => void
}

/** Per-browser preferences edited on the Personal page. Theme and language
 * live in their own stores (next-themes' `nd-theme`, i18n's `locale`). */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultView: DEFAULT_VIEW_HOME,
      setDefaultView: (defaultView) => set({ defaultView }),
      replayGainMode: 'none',
      setReplayGainMode: (replayGainMode) => set({ replayGainMode }),
      replayGainPreAmp: 0,
      setReplayGainPreAmp: (preAmp) =>
        set({
          replayGainPreAmp: Math.min(
            REPLAY_GAIN_PREAMP_MAX,
            Math.max(REPLAY_GAIN_PREAMP_MIN, preAmp),
          ),
        }),
      notifications: false,
      setNotifications: (notifications) => set({ notifications }),
    }),
    { name: 'nd-settings' },
  ),
)
