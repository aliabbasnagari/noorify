import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api/http'
import { useAuthStore } from '@/stores/auth-store'
import { useSettingsStore } from '@/stores/settings-store'
import i18n, { setLanguage } from '@/i18n'
import PersonalPage from './personal-page'

vi.mock('@/lib/api/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/http')>()),
  apiFetch: vi.fn(),
}))
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate: vi.fn() }),
}))

const session = {
  token: 't',
  id: 'u1',
  name: 'Ada',
  username: 'ada',
  isAdmin: false,
  subsonicSalt: 's',
  subsonicToken: 'st',
}

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <PersonalPage />
    </QueryClientProvider>,
  )
}

describe('PersonalPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ session })
    useSettingsStore.setState({
      defaultView: 'home',
      replayGainMode: 'none',
      replayGainPreAmp: 0,
      notifications: false,
    })
    vi.mocked(apiFetch).mockImplementation((path: string) => {
      if (path === '/api/user/u1')
        return Promise.resolve({ id: 'u1', name: 'Ada', email: 'ada@x.io' })
      if (path === '/api/lastfm/link')
        return Promise.resolve({ status: false, apiKey: 'key' })
      return Promise.resolve({ status: false })
    })
  })

  it('shows every settings section', async () => {
    renderPage()
    for (const heading of ['Appearance', 'Playback', 'Scrobbling', 'Account']) {
      expect(
        await screen.findByRole('heading', { name: heading }),
      ).toBeInTheDocument()
    }
    expect(
      screen.getByRole('switch', { name: 'Scrobble to Last.fm' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: 'Scrobble to ListenBrainz' }),
    ).toBeInTheDocument()
  })

  it('only shows the pre-amp once ReplayGain is on', async () => {
    renderPage()
    expect(screen.queryByLabelText('Pre-amp (dB)')).not.toBeInTheDocument()
    useSettingsStore.getState().setReplayGainMode('album')
    expect(await screen.findByLabelText('Pre-amp (dB)')).toBeInTheDocument()
  })

  it('clamps the pre-amp to the supported range', () => {
    useSettingsStore.getState().setReplayGainPreAmp(40)
    expect(useSettingsStore.getState().replayGainPreAmp).toBe(15)
    useSettingsStore.getState().setReplayGainPreAmp(-40)
    expect(useSettingsStore.getState().replayGainPreAmp).toBe(-15)
  })

  it('prefills the account form from the server', async () => {
    renderPage()
    await waitFor(() =>
      expect(screen.getByLabelText('Email')).toHaveValue('ada@x.io'),
    )
    expect(screen.getByLabelText('Username')).toBeDisabled()
  })

  it('requires the current password to change it', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() =>
      expect(screen.getByLabelText('Email')).toHaveValue('ada@x.io'),
    )
    await user.click(screen.getByRole('button', { name: 'Change password' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect((await screen.findAllByText('Required')).length).toBeGreaterThan(0)
    expect(apiFetch).not.toHaveBeenCalledWith(
      '/api/user/u1',
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('switches language and text direction', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByLabelText('Language'))
    await user.click(await screen.findByRole('option', { name: 'العربية' }))
    await waitFor(() => expect(i18n.language).toBe('ar'))
    expect(document.documentElement.dir).toBe('rtl')
    expect(localStorage.getItem('locale')).toBe('ar')
    await setLanguage('en')
    expect(document.documentElement.dir).toBe('ltr')
  })
})
