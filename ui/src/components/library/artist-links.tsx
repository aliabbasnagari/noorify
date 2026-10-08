import { Fragment } from "react"
import { Link } from "@tanstack/react-router"

export interface ArtistRef {
  id: string
  name: string
}

/** Artist credit with one link per artist ("A • B"), so each can be clicked
 * on its own. Falls back to the single primary artist, then to plain text
 * (radio stations, queues saved before artist ids were stored). */
export function ArtistLinks({
  artist,
  artistId,
  artists,
  className,
}: {
  artist: string
  artistId?: string
  artists?: ArtistRef[]
  className?: string
}) {
  const refs: ArtistRef[] = artists?.length
    ? artists
    : artistId
      ? [{ id: artistId, name: artist }]
      : []
  if (refs.length === 0) return <>{artist}</>

  return (
    <>
      {refs.map((ref, i) => (
        <Fragment key={ref.id}>
          {i > 0 && " • "}
          <Link
            to="/artist/$artistId"
            params={{ artistId: ref.id }}
            className={className}
          >
            {ref.name}
          </Link>
        </Fragment>
      ))}
    </>
  )
}
