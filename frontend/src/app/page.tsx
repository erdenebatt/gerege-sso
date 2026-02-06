'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { OAuthButtons } from '@/components/auth'
import { Header } from '@/components/layout'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore, useTranslation } from '@/stores/settingsStore'

function LoginPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { token, fetchUser } = useAuthStore()
  const { theme } = useSettingsStore()
  const t = useTranslation()
  const [error, setError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const urlError = searchParams.get('error')
    if (urlError) {
      setError(decodeURIComponent(urlError))
    }

    const checkAuth = async () => {
      if (token) {
        const user = await fetchUser()
        if (user) {
          const redirect = searchParams.get('redirect') || '/dashboard'
          router.replace(redirect)
          return
        }
      }
      setIsChecking(false)
    }

    checkAuth()
  }, [token, fetchUser, router, searchParams])

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
        backgroundImage: theme === 'dark' ? 'url(/assets/bg-pattern-dark.svg)' : 'url(/assets/bg-pattern.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
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
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

          {/* Description */}
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
            {t.loginDescription}
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <p className="text-slate-500 dark:text-slate-400">
            {t.copyright}
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {t.privacy}
            </Link>
            <Link href="/terms" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {t.terms}
            </Link>
            <Link href="/docs" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
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
