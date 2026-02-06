'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { Sidebar, UserDropdown } from '@/components/layout'
import { Badge, Button, Skeleton, useToast } from '@/components/ui'
import { useSettingsStore } from '@/stores/settingsStore'
import { formatDate } from '@/lib/utils'

export default function GrantsPage() {
  const router = useRouter()
  const { token, grants, fetchGrants, revokeGrant } = useAuthStore()
  const { showToast } = useToast()
  const { theme, toggleTheme } = useSettingsStore()
  const [isLoading, setIsLoading] = useState(true)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      router.replace('/?redirect=/grants')
      return
    }

    fetchGrants().finally(() => setIsLoading(false))
  }, [token, fetchGrants, router])

  const handleRevoke = async (grantId: string, clientName: string) => {
    if (!confirm(`${clientName} аппликейшны хандах эрхийг цуцлах уу?`)) {
      return
    }

    setRevokingId(grantId)
    const success = await revokeGrant(grantId)
    setRevokingId(null)

    if (success) {
      showToast('Эрх амжилттай цуцлагдлаа', 'success')
    } else {
      showToast('Алдаа гарлаа', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />

      <div className="lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-40 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            Холбогдсон аппликейшнүүд
          </h1>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <div className="pl-2 border-l border-slate-200 dark:border-slate-700 ml-2">
              <UserDropdown />
            </div>
          </div>
        </header>

        <main className="p-6">
          <div className="max-w-4xl mx-auto">
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Эдгээр аппликейшнүүд таны Gerege дансанд хандах эрхтэй.
            </p>

            <div className="space-y-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-28" />
                  <Skeleton className="h-28" />
                  <Skeleton className="h-28" />
                </>
              ) : grants.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                    Одоогоор ямар ч аппликейшн таны дансанд холбогдоогүй байна.
                  </p>
                </div>
              ) : (
                grants.map((grant) => (
                  <div
                    key={grant.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                  >
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                        {grant.client_name}
                      </h3>
                      <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                        <span className="mr-4">
                          Холбогдсон: {formatDate(grant.granted_at)}
                        </span>
                        {grant.last_used_at && (
                          <span>
                            Сүүлд ашигласан: {formatDate(grant.last_used_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {grant.scopes?.map((scope) => (
                          <Badge key={scope} variant="success">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRevoke(grant.id, grant.client_name)}
                      isLoading={revokingId === grant.id}
                      disabled={!!revokingId}
                    >
                      Цуцлах
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
