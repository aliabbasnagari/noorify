import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueuePanel } from './queue-panel'
import { usePlayerStore, type QueuedTrack } from '@/stores/player-store'

vi.mock('@/lib/player/audio-engine', () => ({
  audioEngine: {
    togglePlayPause: vi.fn(),
    previous: vi.fn(),
    next: vi.fn(),
    seek: vi.fn(),
  },
}))

function track(id: string, title: string): QueuedTrack {
  return {
    id,
    title,
    artist: 'Artist',
    albumId: 'a',
    albumTitle: 'Album',
    durationSeconds: 200,
  }
}

function resetStore() {
  usePlayerStore.setState({
    queue: [],
    currentIndex: -1,
    shuffle: false,
    unshuffledQueue: null,
    repeatMode: 'off',
    volume: 100,
    muted: false,
    isPlaying: false,
    isBuffering: false,
    currentTime: 0,
    duration: 0,
  })
}

describe('QueuePanel', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
  })

  it('lists every track, including already-played ones, and can remove one', async () => {
    usePlayerStore.setState({
      queue: [track('1', 'A'), track('2', 'B'), track('3', 'C')],
      currentIndex: 1,
    })
    render(<QueuePanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Queue' }))

    // "A" already finished playing but stays in the list.
    expect(await screen.findByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()

    // The current track (B) has no remove button; A and C do.
    const removeButtons = screen.getAllByRole('button', {
      name: 'Remove from queue',
    })
    expect(removeButtons).toHaveLength(2)
    fireEvent.click(removeButtons[0])
    expect(usePlayerStore.getState().queue.map((t) => t.title)).toEqual([
      'B',
      'C',
    ])
  })

  it('keeps the queue intact as playback advances', async () => {
    usePlayerStore.setState({
      queue: [track('1', 'A'), track('2', 'B')],
      currentIndex: 0,
    })
    render(<QueuePanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Queue' }))
    usePlayerStore.getState().playNext()

    expect(await screen.findByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('shows an empty message when the queue is empty', async () => {
    render(<QueuePanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Queue' }))

    expect(await screen.findByText('Queue is empty.')).toBeInTheDocument()
  })

  it('offers to save a non-empty queue as a playlist', async () => {
    usePlayerStore.setState({ queue: [track('1', 'A')], currentIndex: 0 })
    render(<QueuePanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Queue' }))

    expect(
      await screen.findByRole('button', { name: 'Save as playlist' }),
    ).toBeInTheDocument()
  })

  describe('shuffle and clear', () => {
    const openQueue = () =>
      fireEvent.click(screen.getByRole('button', { name: 'Queue' }))

    it('shuffles the queue in place, keeping the playing track first', async () => {
      const upcoming = Array.from({ length: 12 }, (_, i) =>
        track(`t${i}`, `T${i}`),
      )
      usePlayerStore.setState({
        queue: [track('now', 'Now'), ...upcoming],
        currentIndex: 0,
      })
      render(<QueuePanel />)
      openQueue()

      const button = await screen.findByRole('button', { name: 'Shuffle' })
      expect(button).toHaveAttribute('aria-pressed', 'false')
      fireEvent.click(button)

      const state = usePlayerStore.getState()
      expect(state.shuffle).toBe(true)
      expect(state.queue[0].id).toBe('now')
      expect(state.queue.map((t) => t.id).sort()).toEqual(
        ['now', ...upcoming.map((t) => t.id)].sort(),
      )
      expect(screen.getByRole('button', { name: 'Shuffle' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })

    it('disables shuffle and clear when there is nothing to reorder or clear', async () => {
      usePlayerStore.setState({ queue: [track('1', 'A')], currentIndex: 0 })
      render(<QueuePanel />)
      openQueue()

      expect(
        await screen.findByRole('button', { name: 'Shuffle' }),
      ).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Clear queue' })).toBeDisabled()
    })

    it('clears everything except the playing track, history included', async () => {
      usePlayerStore.setState({
        queue: [track('1', 'A'), track('2', 'B'), track('3', 'C')],
        currentIndex: 1,
        playNonce: 7,
      })
      render(<QueuePanel />)
      openQueue()

      fireEvent.click(
        await screen.findByRole('button', { name: 'Clear queue' }),
      )

      const state = usePlayerStore.getState()
      expect(state.queue.map((t) => t.title)).toEqual(['B'])
      expect(state.currentIndex).toBe(0)
      // The audio engine restarts a track on a nonce bump — it must not.
      expect(state.playNonce).toBe(7)
      expect(screen.queryByText('A')).not.toBeInTheDocument()
      expect(screen.queryByText('C')).not.toBeInTheDocument()
    })
  })
})
