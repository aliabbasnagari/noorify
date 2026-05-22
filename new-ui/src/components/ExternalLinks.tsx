/**
 * ExternalLinks — ported from ui/src/album/AlbumExternalLinks.jsx
 *                           and ui/src/artist/ArtistExternalLink.jsx
 *
 * Renders icon links to Last.fm and MusicBrainz based on available IDs/URLs.
 */

interface AlbumExternalLinksProps {
  albumArtist?: string
  albumName?: string
  mbzAlbumId?: string
}

interface ArtistExternalLinksProps {
  artistName?: string
  lastFmUrl?: string
  musicBrainzId?: string
}

function LinkButton({
  href,
  title,
  children,
}: {
  href: string
  title: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 text-[#a7a7a7] hover:text-white transition-colors"
    >
      {children}
    </a>
  )
}

/** Inline SVG for Last.fm "lfm" icon */
function LastFmIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M10.584 17.21l-.88-2.392s-1.43 1.596-3.573 1.596c-1.897 0-3.244-1.652-3.244-4.294 0-3.384 1.706-4.596 3.386-4.596 2.42 0 3.189 1.569 3.849 3.576l.878 2.75C11.88 16.997 13.563 19 16.924 19c3.629 0 6.085-2.63 6.085-6.024 0-3.028-1.73-4.843-4.104-5.507L18.2 9.54c1.646.522 2.48 1.705 2.48 3.474 0 2.192-1.37 3.697-3.715 3.697-2.017 0-3.095-1.432-3.934-3.879l-.878-2.773C11.13 7.276 9.39 6 7.086 6 4.025 6 1.992 8.34 1.992 12.125 1.992 15.774 3.993 19 7.427 19c2.286 0 3.157-1.79 3.157-1.79z" />
    </svg>
  )
}

/** Inline SVG for MusicBrainz logo */
function MusicBrainzIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 1.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zm-1 3v5.086l-3.207 3.207 1.06 1.061L12 12.661l3.147 3.193 1.06-1.06L13 11.586V6.5h-2z" />
    </svg>
  )
}

export function AlbumExternalLinks({ albumArtist, albumName, mbzAlbumId }: AlbumExternalLinksProps) {
  if (!albumArtist && !mbzAlbumId) return null
  return (
    <div className="flex items-center gap-0.5">
      {albumArtist && albumName && (
        <LinkButton
          href={`https://www.last.fm/music/${encodeURIComponent(albumArtist)}/${encodeURIComponent(albumName)}`}
          title="Open in Last.fm"
        >
          <LastFmIcon />
        </LinkButton>
      )}
      {mbzAlbumId && (
        <LinkButton
          href={`https://musicbrainz.org/release/${mbzAlbumId}`}
          title="Open in MusicBrainz"
        >
          <MusicBrainzIcon />
        </LinkButton>
      )}
    </div>
  )
}

export function ArtistExternalLinks({ artistName, lastFmUrl, musicBrainzId }: ArtistExternalLinksProps) {
  const lfmUrl = lastFmUrl || (artistName ? `https://www.last.fm/music/${encodeURIComponent(artistName)}` : null)
  if (!lfmUrl && !musicBrainzId) return null
  return (
    <div className="flex items-center gap-0.5">
      {lfmUrl && (
        <LinkButton href={lfmUrl} title="Open in Last.fm">
          <LastFmIcon />
        </LinkButton>
      )}
      {musicBrainzId && (
        <LinkButton
          href={`https://musicbrainz.org/artist/${musicBrainzId}`}
          title="Open in MusicBrainz"
        >
          <MusicBrainzIcon />
        </LinkButton>
      )}
    </div>
  )
}
