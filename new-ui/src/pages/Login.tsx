import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Music2, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/I18nContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const { login, createAdmin, isLoading, error, clearError, user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from ?? '/'

  const [isFirstTime, setIsFirstTime] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({})

  // Redirect if already authenticated
  useEffect(() => {
    if (user) navigate(from, { replace: true })
  }, [user, navigate, from])

  // Check if this is first-time setup
  useEffect(() => {
    fetch('/auth/status')
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg.firstTime) setIsFirstTime(true)
      })
      .catch(() => {/* ignore – server may not be running */})
  }, [])

  function validate(): boolean {
    const errs: typeof fieldErrors = {}
    if (!username.trim()) errs.username = t('auth.usernameRequired')
    if (!password) errs.password = t('auth.passwordRequired')
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    clearError()
    try {
      if (isFirstTime) {
        await createAdmin(username.trim(), password)
      } else {
        await login(username.trim(), password)
      }
      navigate(from, { replace: true })
    } catch {
      // error already set in context
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#1db954]/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-800/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#1db954]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-[#1db954] rounded-full flex items-center justify-center mb-4">
            <Music2 size={24} className="text-black" />
          </div>
          <h1 className="text-3xl font-black text-white">
            {isFirstTime ? t('auth.setupTitle') : t('auth.loginTitle')}
          </h1>
          {isFirstTime && (
            <p className="text-[#a7a7a7] text-sm mt-2 text-center">
              {t('auth.setupSubtitle')}
            </p>
          )}
        </div>

        {/* Card */}
        <div className="bg-[#121212] rounded-xl p-8 border border-white/10 shadow-2xl">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-white font-semibold">{t('auth.username')}</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setFieldErrors((p) => ({ ...p, username: undefined }))
                }}
                className={cn(
                  'h-12 bg-[#2a2a2a] text-white border-transparent focus-visible:border-[#1db954] focus-visible:ring-0 placeholder:text-[#6b6b6b]',
                  fieldErrors.username && 'border-red-500 focus-visible:border-red-400',
                )}
                placeholder={t('auth.username')}
              />
              {fieldErrors.username && (
                <p className="text-red-400 text-xs">{fieldErrors.username}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-white font-semibold">{t('auth.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isFirstTime ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setFieldErrors((p) => ({ ...p, password: undefined }))
                  }}
                  className={cn(
                    'h-12 bg-[#2a2a2a] text-white border-transparent focus-visible:border-[#1db954] focus-visible:ring-0 pr-11 placeholder:text-[#6b6b6b]',
                    fieldErrors.password && 'border-red-500 focus-visible:border-red-400',
                  )}
                  placeholder={t('auth.password')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a7a7a7] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-red-400 text-xs">{fieldErrors.password}</p>
              )}
            </div>

            {/* Server error */}
            {error && (
              <div className="bg-red-900/40 border border-red-500/50 rounded-md px-4 py-3">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#1db954] hover:bg-[#1ed760] text-black font-bold text-base rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : isFirstTime ? (
                t('auth.createAdmin')
              ) : (
                t('auth.signIn')
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <Separator className="flex-1 bg-white/10" />
            <span className="text-[#a7a7a7] text-xs uppercase tracking-widest">or</span>
            <Separator className="flex-1 bg-white/10" />
          </div>

          {/* Subsonic / third-party note */}
          <p className="text-[#a7a7a7] text-xs text-center leading-relaxed">
            You can also connect any Subsonic-compatible app directly to
            this server using the Subsonic API.
          </p>
        </div>

        <p className="text-[#6a6a6a] text-xs text-center mt-6">
          Navidrome — your music, your server
        </p>
      </div>
    </div>
  )
}

