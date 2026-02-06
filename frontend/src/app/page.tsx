'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { LoginCard } from '@/components/auth'
import { Header } from '@/components/layout'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore, useTranslation } from '@/stores/settingsStore'

export default function LoginPage() {
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-slate-700 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">{t.checking}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-grid-pattern relative overflow-hidden">
      <Header />

      {/* Background gradient orbs */}
      <div className="absolute top-0 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-[100px]" />

      {/* Main content */}
      <main className="min-h-screen flex items-center justify-center p-5 pt-20">
        <LoginCard error={error} />
      </main>
    </div>
  )
}
