'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

interface ProtectedRouteProps {
  children: ReactNode
  fallback?: ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { token, user, isLoading, fetchUser } = useAuthStore()

  useEffect(() => {
    if (!token) {
      router.replace(`/?redirect=${encodeURIComponent(pathname)}`)
      return
    }

    if (!user && !isLoading) {
      fetchUser().then((userData) => {
        if (!userData) {
          router.replace(`/?redirect=${encodeURIComponent(pathname)}`)
        }
      })
    }
  }, [token, user, isLoading, fetchUser, router, pathname])

  if (!token || isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60">Уншиж байна...</p>
          </div>
        </div>
      )
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
