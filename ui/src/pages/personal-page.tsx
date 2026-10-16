import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { LANGUAGES, setLanguage, type LanguageId } from '@/i18n'
import { config } from '@/lib/config'
import { DEFAULT_VIEW_OPTIONS } from '@/lib/default-view'
import { notificationsAvailable } from '@/lib/notifications'
import { THEMES, THEME_LABEL_KEYS } from '@/lib/themes'
import { useAuthStore } from '@/stores/auth-store'
import {
  REPLAY_GAIN_PREAMP_MAX,
  REPLAY_GAIN_PREAMP_MIN,
  useSettingsStore,
  type ReplayGainMode,
} from '@/stores/settings-store'
import { AccountSection } from '@/components/personal/account-section'
import { LastfmSetting } from '@/components/personal/lastfm-setting'
import { ListenBrainzSetting } from '@/components/personal/listenbrainz-setting'
import {
  OptionSelect,
  SettingRow,
  SettingsSection,
} from '@/components/personal/setting-row'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

const REPLAY_GAIN_MODES: ReplayGainMode[] = ['none', 'album', 'track']

export default function PersonalPage() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const session = useAuthStore((s) => s.session)
  const settings = useSettingsStore()

  const canEditAccount =
    session !== null && (session.isAdmin || config.enableUserEditing)
  const showScrobbling = config.lastFMEnabled || config.listenBrainzEnabled

  async function toggleNotifications(enabled: boolean) {
    if (!enabled) {
      settings.setNotifications(false)
      return
    }
    if (Notification.permission === 'denied') {
      toast.warning(t('personal.notificationsBlocked'))
      return
    }
    const permission =
      Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission()
    settings.setNotifications(permission === 'granted')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-6">
      <h1 className="text-2xl font-bold">{t('personal.title')}</h1>

      <SettingsSection title={t('personal.appearance')}>
        <SettingRow label={t('common.theme')} htmlFor="personal-theme">
          <OptionSelect
            id="personal-theme"
            value={theme ?? 'dark'}
            onChange={setTheme}
            options={THEMES.map((id) => ({
              value: id,
              label: t(THEME_LABEL_KEYS[id]),
            }))}
          />
        </SettingRow>
        <SettingRow label={t('personal.language')} htmlFor="personal-language">
          <OptionSelect
            id="personal-language"
            value={i18n.language}
            onChange={(id) => void setLanguage(id as LanguageId)}
            options={LANGUAGES.map((language) => ({
              value: language.id,
              label: language.name,
            }))}
          />
        </SettingRow>
        <SettingRow
          label={t('personal.defaultView')}
          description={t('personal.defaultViewHelp')}
          htmlFor="personal-default-view"
        >
          <OptionSelect
            id="personal-default-view"
            value={settings.defaultView}
            onChange={settings.setDefaultView}
            options={DEFAULT_VIEW_OPTIONS.map((option) => ({
              value: option.id,
              label: t(option.labelKey),
            }))}
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection title={t('personal.playback')}>
        {config.enableReplayGain && (
          <>
            <SettingRow
              label={t('personal.replayGain')}
              description={t('personal.replayGainHelp')}
              htmlFor="personal-replaygain"
            >
              <OptionSelect
                id="personal-replaygain"
                value={settings.replayGainMode}
                onChange={(mode) =>
                  settings.setReplayGainMode(mode as ReplayGainMode)
                }
                options={REPLAY_GAIN_MODES.map((mode) => ({
                  value: mode,
                  label: t(`personal.replayGainModes.${mode}`),
                }))}
              />
            </SettingRow>
            {settings.replayGainMode !== 'none' && (
              <SettingRow
                label={t('personal.preAmp')}
                htmlFor="personal-preamp"
              >
                <Input
                  id="personal-preamp"
                  type="number"
                  className="w-full sm:w-28"
                  step={0.5}
                  min={REPLAY_GAIN_PREAMP_MIN}
                  max={REPLAY_GAIN_PREAMP_MAX}
                  value={settings.replayGainPreAmp}
                  onChange={(event) => {
                    const value = event.target.valueAsNumber
                    if (!Number.isNaN(value))
                      settings.setReplayGainPreAmp(value)
                  }}
                />
              </SettingRow>
            )}
          </>
        )}
        <SettingRow
          label={t('personal.desktopNotifications')}
          description={
            notificationsAvailable()
              ? t('personal.desktopNotificationsHelp')
              : t('personal.notificationsUnavailable')
          }
          htmlFor="personal-notifications"
        >
          <Switch
            id="personal-notifications"
            checked={
              settings.notifications &&
              notificationsAvailable() &&
              Notification.permission === 'granted'
            }
            disabled={!notificationsAvailable()}
            onCheckedChange={(enabled) => void toggleNotifications(enabled)}
          />
        </SettingRow>
      </SettingsSection>

      {showScrobbling && (
        <SettingsSection title={t('personal.scrobbling')}>
          {config.lastFMEnabled && <LastfmSetting />}
          {config.listenBrainzEnabled && <ListenBrainzSetting />}
        </SettingsSection>
      )}

      {canEditAccount && session && (
        <SettingsSection title={t('personal.account.title')}>
          <AccountSection session={session} />
        </SettingsSection>
      )}
    </div>
  )
}
