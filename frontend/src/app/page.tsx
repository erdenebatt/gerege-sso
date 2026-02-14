'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { OAuthButtons, EmailOTPLogin } from '@/components/auth'
import { Header } from '@/components/layout'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore, useTranslation } from '@/stores/settingsStore'
import { api } from '@/lib/api'

type LoginTab = 'main' | 'qr'

function LoginPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { token, setToken, setMFAPending, fetchUser } = useAuthStore()
  const { theme } = useSettingsStore()
  const t = useTranslation()
  const [error, setError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const [loginTab, setLoginTab] = useState<LoginTab>('main')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [qrSessionId, setQrSessionId] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const urlError = searchParams.get('error')
    if (urlError) {
      setError(decodeURIComponent(urlError))
    }

    // Store redirect param for after OAuth login flow
    const redirectParam = searchParams.get('redirect')
    if (redirectParam) {
      localStorage.setItem('oauth_redirect', redirectParam)
    }

    const checkAuth = async () => {
      if (token) {
        const user = await fetchUser()
        if (user) {
          if (!user.verified) {
            router.replace('/register')
            return
          }
          const redirect = redirectParam || localStorage.getItem('oauth_redirect') || '/dashboard'
          localStorage.removeItem('oauth_redirect')
          if (redirect.startsWith('/api/')) {
            window.location.href = redirect
          } else {
            router.replace(redirect)
          }
          return
        }
      }
      setIsChecking(false)
    }

    checkAuth()
  }, [token, fetchUser, router, searchParams])

  // Cleanup QR polling on unmount
  useEffect(() => {
    return () => {
      if (qrPollRef.current) clearInterval(qrPollRef.current)
    }
  }, [])

  const handleQRLogin = async () => {
    setQrLoading(true)
    setError(null)
    try {
      const data = await api.mfa.generateQR()
      setQrCode(data.qr_code)
      setQrSessionId(data.session_id)

      // Poll for QR approval
      if (qrPollRef.current) clearInterval(qrPollRef.current)
      qrPollRef.current = setInterval(async () => {
        try {
          const status = await api.mfa.getQRStatus(data.session_id)
          if (status.status === 'approved' && status.token) {
            if (qrPollRef.current) clearInterval(qrPollRef.current)
            setToken(status.token)
            router.replace('/dashboard')
          } else if (status.status === 'expired') {
            if (qrPollRef.current) clearInterval(qrPollRef.current)
            setError('QR код хугацаа дууслаа')
            setQrCode(null)
            setQrSessionId(null)
          }
        } catch {
          // Continue polling
        }
      }, 2000)

      // Timeout after 5 minutes
      setTimeout(() => {
        if (qrPollRef.current) clearInterval(qrPollRef.current)
      }, 300000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'QR код үүсгэхэд алдаа гарлаа')
    } finally {
      setQrLoading(false)
    }
  }

  const handlePasskeyLogin = async () => {
    setPasskeyLoading(true)
    setError(null)
    try {
      const { startAuthentication } = await import('@simplewebauthn/browser')
      const beginData = await api.mfa.passkeyLoginBegin()
      const authResp = await startAuthentication({
        optionsJSON: beginData.publicKey as any,
      })
      const data = await api.mfa.passkeyLoginFinish({
        session_key: beginData.session_key,
        ...authResp,
      })
      if (data.token) {
        setToken(data.token)
        const user = await fetchUser()
        if (user?.verified) {
          router.replace('/dashboard')
        } else {
          router.replace('/register')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passkey нэвтрэлт амжилтгүй')
    } finally {
      setPasskeyLoading(false)
    }
  }

  if (isChecking && token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-indigo-200 dark:border-indigo-800 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">{t.checking}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage:
          theme === 'dark' ? 'url(/assets/bg-pattern-dark.svg)' : 'url(/assets/bg-pattern.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Header />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-8">
        <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl p-8 md:p-10">
          {/* Logo and Title */}
          <div className="flex items-center gap-3 mb-8">
            <Image
              src="/assets/logo.png"
              alt="Gerege SSO"
              width={48}
              height={48}
              className="rounded-xl"
              priority
            />
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">НЭГДСЭН ТАНИЛТ</h1>
              <p className="text-sm text-blue-600 dark:text-blue-400">НЭВТРЭЛТИЙН СИСТЕМ</p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2">
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </div>
          )}

          {/* OAuth Buttons */}
          <OAuthButtons />

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-600"></div>
            <span className="px-4 text-sm text-slate-400">{t.or}</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-600"></div>
          </div>

          {/* Login Tab Switcher */}
          {loginTab === 'main' ? (
            <>
              {/* Email OTP Login */}
              <EmailOTPLogin />

              {/* Divider */}
              <div className="my-6 flex items-center">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-600"></div>
                <span className="px-4 text-sm text-slate-400">{t.or}</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-600"></div>
              </div>

              {/* Quick Login Options */}
              <div className="space-y-3">
                {/* Passkey Login */}
                <button
                  onClick={handlePasskeyLogin}
                  disabled={passkeyLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {passkeyLoading ? (
                    <div className="w-5 h-5 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                  )}
                  Passkey-гээр нэвтрэх
                </button>

                {/* QR Login */}
                <button
                  onClick={() => {
                    setLoginTab('qr')
                    handleQRLogin()
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-sm font-medium"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                    />
                  </svg>
                  QR кодоор нэвтрэх
                </button>
              </div>
            </>
          ) : (
            /* QR Login View */
            <div className="text-center">
              {qrLoading ? (
                <div className="py-8">
                  <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    QR код үүсгэж байна...
                  </p>
                </div>
              ) : qrCode ? (
                <div className="py-4">
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                    Gerege Authenticator апп-аар QR кодыг уншуулна уу:
                  </p>
                  <div className="inline-block p-4 bg-white rounded-xl mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                      alt="QR Login"
                      width={200}
                      height={200}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <div className="w-4 h-4 border-2 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
                    Хүлээж байна...
                  </div>
                </div>
              ) : (
                <div className="py-8">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    QR код үүсгэхэд алдаа гарлаа
                  </p>
                  <button
                    onClick={handleQRLogin}
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Дахин оролдох
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  setLoginTab('main')
                  if (qrPollRef.current) clearInterval(qrPollRef.current)
                  setQrCode(null)
                  setQrSessionId(null)
                }}
                className="mt-4 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Буцах
              </button>
            </div>
          )}

          <div className="mt-6" />

          {/* Description */}
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
            {t.loginDescription}
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <p className="text-slate-500 dark:text-slate-400">{t.copyright}</p>
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {t.privacy}
            </Link>
            <Link
              href="/terms"
              className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {t.terms}
            </Link>
            <Link
              href="/docs"
              className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {t.api}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-indigo-200 dark:border-indigo-800 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginPageContent />
    </Suspense>
  )
}
