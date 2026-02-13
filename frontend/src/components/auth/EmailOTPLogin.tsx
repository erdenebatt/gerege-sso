'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useTranslation } from '@/stores/settingsStore'

type State = 'idle' | 'sending' | 'otp_sent' | 'verifying'

export function EmailOTPLogin() {
  const router = useRouter()
  const { setToken, fetchUser } = useAuthStore()
  const t = useTranslation()

  const [state, setState] = useState<State>('idle')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [devOtp, setDevOtp] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleSendOTP = useCallback(async () => {
    if (!email.trim()) return
    setError(null)
    setState('sending')

    try {
      const res = await api.auth.sendEmailOTP(email.trim())
      setState('otp_sent')
      setCooldown(60)
      if (res.otp) {
        setDevOtp(res.otp)
      }
    } catch (err) {
      setState('idle')
      setError(err instanceof Error ? err.message : 'Failed to send OTP')
    }
  }, [email])

  const handleVerifyOTP = useCallback(async () => {
    if (!otp.trim()) return
    setError(null)
    setState('verifying')

    try {
      const res = await api.auth.verifyEmailOTP(email.trim(), otp.trim())

      // Exchange code for token
      const tokenRes = await api.auth.exchangeToken(res.code)
      setToken(tokenRes.token)

      // Fetch user and redirect
      const userData = await fetchUser()
      if (userData && !userData.verified) {
        router.replace('/register')
        return
      }
      const redirect = localStorage.getItem('oauth_redirect') || '/dashboard'
      localStorage.removeItem('oauth_redirect')
      router.replace(redirect)
    } catch (err) {
      setState('otp_sent')
      setError(err instanceof Error ? err.message : 'Verification failed')
    }
  }, [email, otp, setToken, fetchUser, router])

  const handleResend = useCallback(() => {
    setOtp('')
    setError(null)
    setDevOtp(null)
    handleSendOTP()
  }, [handleSendOTP])

  const handleBack = useCallback(() => {
    setState('idle')
    setOtp('')
    setError(null)
    setDevOtp(null)
  }, [])

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-500 dark:text-red-400 text-center">{error}</p>}

      {(state === 'idle' || state === 'sending') && (
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
            placeholder={t.emailPlaceholder}
            disabled={state === 'sending'}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleSendOTP}
            disabled={state === 'sending' || !email.trim()}
            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium transition-colors whitespace-nowrap"
          >
            {state === 'sending' ? t.sending : t.sendCode}
          </button>
        </div>
      )}

      {(state === 'otp_sent' || state === 'verifying') && (
        <>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <svg
              className="w-4 h-4 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>
              {t.otpSent}: {email}
            </span>
            <button
              onClick={handleBack}
              className="ml-auto text-blue-600 dark:text-blue-400 hover:underline text-xs"
            >
              &larr;
            </button>
          </div>

          {devOtp && (
            <p className="text-xs text-amber-600 dark:text-amber-400 text-center font-mono bg-amber-50 dark:bg-amber-500/10 rounded-lg py-1">
              Dev OTP: {devOtp}
            </p>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
              placeholder={t.otpPlaceholder}
              disabled={state === 'verifying'}
              autoFocus
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm text-center tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={handleVerifyOTP}
              disabled={state === 'verifying' || otp.length !== 6}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium transition-colors whitespace-nowrap"
            >
              {state === 'verifying' ? t.verifying : t.verifyCode}
            </button>
          </div>

          <div className="text-center">
            <button
              onClick={handleResend}
              disabled={cooldown > 0}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:text-slate-400 disabled:no-underline disabled:cursor-default"
            >
              {cooldown > 0 ? `${t.otpResend} (${cooldown}s)` : t.otpResend}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
