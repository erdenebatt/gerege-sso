'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import { Button, Input } from '@/components/ui'

type MFAMethod = 'totp' | 'passkey' | 'push' | 'recovery'

export default function MFAChallengePage() {
  const router = useRouter()
  const { token, mfaPending, setToken, clearMFA, logout } = useAuthStore()

  const [activeMethod, setActiveMethod] = useState<MFAMethod>('totp')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pushChallengeId, setPushChallengeId] = useState<string | null>(null)
  const [pushNumber, setPushNumber] = useState<number | null>(null)
  const [methods, setMethods] = useState<string[]>([])

  useEffect(() => {
    if (!token || !mfaPending) {
      router.replace('/')
      return
    }

    // Load available MFA methods
    api.mfa
      .getSettings()
      .then((settings) => {
        const available: string[] = []
        if (settings.totp_enabled) available.push('totp')
        if (settings.passkey_enabled) available.push('passkey')
        if (settings.push_enabled) available.push('push')
        available.push('recovery')
        setMethods(available)

        if (settings.preferred_method && available.includes(settings.preferred_method)) {
          setActiveMethod(settings.preferred_method as MFAMethod)
        } else if (available.length > 0) {
          setActiveMethod(available[0] as MFAMethod)
        }
      })
      .catch(() => {
        // Default to TOTP if we can't load settings
        setMethods(['totp', 'recovery'])
      })
  }, [token, mfaPending, router])

  const handleTOTPSubmit = async () => {
    if (!code.trim()) {
      setError('Код оруулна уу')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const data = await api.mfa.validateTOTP(code.trim())
      clearMFA()
      setToken(data.token)
      router.replace('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Буруу код')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRecoverySubmit = async () => {
    if (!code.trim()) {
      setError('Recovery код оруулна уу')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const data = await api.mfa.validateRecovery(code.trim())
      clearMFA()
      setToken(data.token)
      router.replace('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Буруу код')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePushSend = async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await api.mfa.sendPushChallenge()
      setPushChallengeId(data.challenge_id)
      setPushNumber(data.number_match)

      // Start polling for approval
      const interval = setInterval(async () => {
        try {
          const status = await api.mfa.getPushStatus(data.challenge_id)
          if (status.status === 'approved' && status.token) {
            clearInterval(interval)
            clearMFA()
            setToken(status.token)
            router.replace('/dashboard')
          } else if (status.status === 'denied' || status.status === 'expired') {
            clearInterval(interval)
            setError('Push баталгаажуулалт цуцлагдсан')
            setPushChallengeId(null)
            setPushNumber(null)
          }
        } catch {
          // Continue polling
        }
      }, 2000)

      // Timeout after 5 minutes
      setTimeout(() => clearInterval(interval), 300000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Push илгээхэд алдаа гарлаа')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.replace('/')
  }

  const methodLabels: Record<string, string> = {
    totp: 'Authenticator',
    passkey: 'Passkey',
    push: 'Push',
    recovery: 'Recovery',
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-slate-50 dark:bg-slate-900">
      <div className="glass rounded-2xl p-8 w-full max-w-[460px]">
        <div className="text-center mb-6">
          <Image
            src="/assets/logo.svg"
            alt="Gerege SSO"
            width={60}
            height={60}
            className="mx-auto mb-4"
            priority
          />
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            Хоёр шатлалт баталгаажуулалт
          </h1>
          <p className="text-sm text-slate-500 dark:text-white/60 mt-1">
            Нэвтрэлтийг баталгаажуулна уу
          </p>
        </div>

        {/* Method Tabs */}
        {methods.length > 1 && (
          <div className="flex gap-1 bg-slate-100 dark:bg-white/5 rounded-xl p-1 mb-6">
            {methods.map((method) => (
              <button
                key={method}
                onClick={() => {
                  setActiveMethod(method as MFAMethod)
                  setError('')
                  setCode('')
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  activeMethod === method
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white/70'
                }`}
              >
                {methodLabels[method] || method}
              </button>
            ))}
          </div>
        )}

        {/* TOTP Input */}
        {activeMethod === 'totp' && (
          <div>
            <p className="text-sm text-slate-600 dark:text-white/70 mb-4">
              Authenticator аппаас 6 оронтой код оруулна уу:
            </p>
            <Input
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="text-center text-2xl tracking-widest mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleTOTPSubmit()}
            />
            <Button
              variant="primary"
              className="w-full"
              onClick={handleTOTPSubmit}
              isLoading={isLoading}
              disabled={code.length !== 6}
            >
              Баталгаажуулах
            </Button>
          </div>
        )}

        {/* Push */}
        {activeMethod === 'push' && (
          <div className="text-center">
            {!pushChallengeId ? (
              <>
                <p className="text-sm text-slate-600 dark:text-white/70 mb-4">
                  Бүртгэлтэй төхөөрөмж рүү push мэдэгдэл илгээх:
                </p>
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handlePushSend}
                  isLoading={isLoading}
                >
                  Push илгээх
                </Button>
              </>
            ) : (
              <>
                <div className="text-5xl font-bold text-indigo-600 dark:text-indigo-400 my-6">
                  {pushNumber}
                </div>
                <p className="text-sm text-slate-600 dark:text-white/70 mb-4">
                  Төхөөрөмж дээрээ энэ тоог сонгоно уу
                </p>
                <div className="w-8 h-8 border-3 border-slate-200 dark:border-white/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400 mt-3">Хүлээж байна...</p>
              </>
            )}
          </div>
        )}

        {/* Recovery */}
        {activeMethod === 'recovery' && (
          <div>
            <p className="text-sm text-slate-600 dark:text-white/70 mb-4">
              Recovery код оруулна уу (XXXX-XXXX формат):
            </p>
            <Input
              placeholder="ABCD-1234"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={9}
              className="text-center text-xl tracking-widest mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleRecoverySubmit()}
            />
            <Button
              variant="primary"
              className="w-full"
              onClick={handleRecoverySubmit}
              isLoading={isLoading}
            >
              Баталгаажуулах
            </Button>
            <p className="text-xs text-slate-400 dark:text-white/40 mt-3 text-center">
              Recovery код нэг удаа ашиглагдана
            </p>
          </div>
        )}

        {/* Passkey */}
        {activeMethod === 'passkey' && (
          <div className="text-center">
            <p className="text-sm text-slate-600 dark:text-white/70 mb-4">
              Passkey ашиглан баталгаажуулна уу:
            </p>
            <Button
              variant="primary"
              className="w-full"
              onClick={async () => {
                setIsLoading(true)
                setError('')
                try {
                  // Dynamic import for WebAuthn
                  const { startAuthentication } = await import('@simplewebauthn/browser')
                  const options: any = await api.mfa.passkeyAuthBegin()
                  const authResp = await startAuthentication({
                    optionsJSON: (options.publicKey ?? options) as any,
                  })
                  const data = await api.mfa.passkeyAuthFinish(authResp)
                  if (data.token) {
                    clearMFA()
                    setToken(data.token)
                    router.replace('/dashboard')
                  }
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Passkey баталгаажуулалт амжилтгүй')
                } finally {
                  setIsLoading(false)
                }
              }}
              isLoading={isLoading}
            >
              Passkey ашиглах
            </Button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 rounded-lg text-red-600 dark:text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Logout */}
        <div className="mt-6 text-center">
          <button
            onClick={handleLogout}
            className="text-sm text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/60 transition-colors"
          >
            Гарах
          </button>
        </div>
      </div>
    </div>
  )
}
