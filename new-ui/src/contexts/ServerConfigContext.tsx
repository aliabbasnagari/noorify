import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface ServerConfig {
  firstTime: boolean
  enableSharing: boolean
  lastFMEnabled: boolean
  listenBrainzEnabled: boolean
  enableDownloads: boolean
  enableFavourites: boolean
  enableStarRating: boolean
  losslessFormats: string[]
}

const defaults: ServerConfig = {
  firstTime: false,
  enableSharing: false,
  lastFMEnabled: false,
  listenBrainzEnabled: false,
  enableDownloads: true,
  enableFavourites: true,
  enableStarRating: true,
  losslessFormats: ['FLAC', 'WAV', 'AIFF', 'DSF', 'DSD', 'OGG', 'OPUS', 'ALAC', 'APE', 'WV'],
}

const ServerConfigContext = createContext<ServerConfig>(defaults)

export function ServerConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ServerConfig>(defaults)

  useEffect(() => {
    fetch('/auth/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setConfig({
            firstTime: !!data.firstTime,
            enableSharing: !!data.enableSharing,
            lastFMEnabled: !!data.lastFMEnabled,
            listenBrainzEnabled: !!data.listenBrainzEnabled,
            enableDownloads: data.enableDownloads !== false,
            enableFavourites: data.enableFavourites !== false,
            enableStarRating: data.enableStarRating !== false,
            losslessFormats: data.losslessFormats
              ? String(data.losslessFormats).split(',').map((s: string) => s.trim().toUpperCase())
              : defaults.losslessFormats,
          })
        }
      })
      .catch(() => {
        // Server not reachable or old version — keep defaults
      })
  }, [])

  return <ServerConfigContext.Provider value={config}>{children}</ServerConfigContext.Provider>
}

export function useServerConfig(): ServerConfig {
  return useContext(ServerConfigContext)
}
