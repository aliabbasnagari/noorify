import { useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import i18n from "@/i18n"
import { getOne } from "@/lib/api/http"
import { star, unstar } from "@/lib/api/subsonic"
import type { Song } from "@/lib/api/types"
import { audioEngine } from "@/lib/player/audio-engine"
import { usePlayerStore } from "@/stores/player-store"
import { useUiStore } from "@/stores/ui-store"

// Ports old-ui's keyMap (old-ui/src/hotkeys.js): TOGGLE_PLAY, PREV_SONG,
// NEXT_SONG, VOL_UP, VOL_DOWN, TOGGLE_MENU, CURRENT_SONG, TOGGLE_LOVE,
// SHOW_HELP — full parity as of Phase 6 (CURRENT_SONG/TOGGLE_LOVE were
// deferred in Phase 1 pending the album route and favorites feature,
// both of which now exist).
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  )
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.closest(
      'select, [role="slider"], [role="menuitem"], [role="option"], [role="tab"], [role="checkbox"], [role="switch"]',
    ) !== null
  )
}

export function usePlayerHotkeys() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    async function toggleLoveCurrentTrack() {
      const { queue, currentIndex } = usePlayerStore.getState()
      const track = queue[currentIndex]
      if (!track || track.isRadio) return
      try {
        const song = await getOne<Song>("song", track.id)
        if (song.starred) {
          await unstar(track.id)
          toast(`Removed "${song.title}" from Your Library`)
        } else {
          await star(track.id)
          toast(`Added "${song.title}" to Your Library`)
        }
        queryClient.invalidateQueries({ queryKey: ["song"] })
        queryClient.invalidateQueries({ queryKey: ["album"] })
      } catch {
        toast.error(i18n.t("errors.loveFailed"))
      }
    }

    function goToCurrentSong() {
      const { queue, currentIndex } = usePlayerStore.getState()
      const track = queue[currentIndex]
      if (!track || track.isRadio || !track.albumId) return
      navigate({ to: "/album/$albumId", params: { albumId: track.albumId } })
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return
      // Leave browser/OS shortcuts (Ctrl+L, Alt+Left = history back, …) alone.
      if (event.ctrlKey || event.altKey || event.metaKey) return

      switch (event.key) {
        case " ":
          // Space belongs to sliders/menus/selects when they have focus (buttons
          // are deliberately excluded: after clicking play, Space should pause).
          if (isInteractiveTarget(event.target)) return
          event.preventDefault()
          audioEngine.togglePlayPause()
          break
        case "ArrowLeft":
          if (!isInteractiveTarget(event.target)) audioEngine.previous()
          break
        case "ArrowRight":
          if (!isInteractiveTarget(event.target)) audioEngine.next()
          break
        case "=":
        case "+": {
          const { volume, setVolume } = usePlayerStore.getState()
          setVolume(volume + 10)
          break
        }
        case "-": {
          const { volume, setVolume } = usePlayerStore.getState()
          setVolume(volume - 10)
          break
        }
        case "m":
          useUiStore.getState().toggleSidebar()
          break
        case "l":
          void toggleLoveCurrentTrack()
          break
        case "C":
          if (event.shiftKey) goToCurrentSong()
          break
        case "?":
          useUiStore.getState().toggleHelpDialog()
          break
        default:
          return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [navigate, queryClient])
}
