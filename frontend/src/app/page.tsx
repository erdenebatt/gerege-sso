'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { LoginCard } from '@/components/auth'
import { useAuthStore } from '@/stores/authStore'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { token, fetchUser } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Check for error in URL
    const urlError = searchParams.get('error')
    if (urlError) {
      setError(decodeURIComponent(urlError))
    }

    // Check if already logged in
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
          <div className="w-10 h-10 border-3 border-slate-200 dark:border-slate-700 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Шалгаж байна...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <LoginCard error={error} />
    </div>
  )
}
