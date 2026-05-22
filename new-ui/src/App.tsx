import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { I18nProvider } from '@/contexts/I18nContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { PlayerProvider } from '@/contexts/PlayerContext'
import { MobileMenuProvider } from '@/contexts/MobileMenuContext'
import { ServerConfigProvider } from '@/contexts/ServerConfigContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { MainLayout } from '@/components/layout/MainLayout'
import LoginPage from '@/pages/Login'
import HomePage from '@/pages/Home'
import SearchPage from '@/pages/Search'
import LibraryPage from '@/pages/Library'
import PlaylistPage from '@/pages/Playlist'
import AlbumPage from '@/pages/Album'
import ArtistPage from '@/pages/Artist'
import UploadPage from '@/pages/Upload'
import LikedSongsPage from '@/pages/LikedSongs'
import RadioPage from '@/pages/Radio'
import SharesPage from '@/pages/Shares'
import SharePlayerPage from '@/pages/SharePlayer'
import SongsPage from '@/pages/Songs'
import GenrePage from '@/pages/Genre'
import SettingsPage from '@/pages/Settings'
import { Bookmarks as BookmarksPage } from '@/pages/Bookmarks'

function App() {
  return (
    <I18nProvider>
    <AuthProvider>
      <ServerConfigProvider>
      <PlayerProvider>
        <MobileMenuProvider>
        <TooltipProvider delayDuration={400}>
          <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/share/:id" element={<SharePlayerPage />} />

            {/* Protected routes — redirect to /login if not authenticated */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/playlist/:id" element={<PlaylistPage />} />
                <Route path="/album/:id" element={<AlbumPage />} />
                <Route path="/artist/:id" element={<ArtistPage />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/liked" element={<LikedSongsPage />} />
                <Route path="/radio" element={<RadioPage />} />
                <Route path="/shares" element={<SharesPage />} />
                <Route path="/songs" element={<SongsPage />} />
                <Route path="/genre/:genre" element={<GenrePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/bookmarks" element={<BookmarksPage />} />
              </Route>
            </Route>
          </Routes>
          </BrowserRouter>
          <Toaster position="bottom-right" offset={96} richColors />
        </TooltipProvider>
        </MobileMenuProvider>
      </PlayerProvider>
      </ServerConfigProvider>
    </AuthProvider>
    </I18nProvider>
  )
}

export default App
