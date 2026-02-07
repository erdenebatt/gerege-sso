'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { formatDateTime } from '@/lib/utils'
import type { LoginEntry } from '@/types'

const PROVIDERS = [
  {
    key: 'google',
    method: 'google_oauth',
    name: 'Google',
    color: 'text-red-500',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
  {
    key: 'facebook',
    method: 'facebook_oauth',
    name: 'Facebook',
    color: 'text-blue-600',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    key: 'twitter',
    method: 'twitter_oauth',
    name: 'Twitter / X',
    color: 'text-slate-900 dark:text-white',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    key: 'apple',
    method: 'apple_oauth',
    name: 'Apple',
    color: 'text-slate-900 dark:text-white',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </svg>
    ),
  },
]

function getMethodFromDetails(details: string): string {
  try {
    const parsed = JSON.parse(details)
    return parsed.method || ''
  } catch {
    return ''
  }
}

function getProviderFromMethod(method: string) {
  return PROVIDERS.find((p) => p.method === method)
}

function LoginRow({ entry }: { entry: LoginEntry }) {
  const method = getMethodFromDetails(entry.details)
  const provider = getProviderFromMethod(method)

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      <div className={`shrink-0 ${provider?.color || 'text-slate-400'}`}>
        {provider?.icon || (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
            />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-slate-900 dark:text-white">
          {provider?.name || 'Нэвтрэлт'}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">IP: {entry.ip_address}</div>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
        {formatDateTime(entry.created_at)}
      </div>
    </div>
  )
}

export default function ActivityPage() {
  const { user } = useAuthStore()
  const [logins, setLogins] = useState<LoginEntry[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivity = useCallback(() => {
    setLoading(true)
    api.auth
      .loginActivity()
      .then((data) => {
        setLogins(data.logins || [])
        setCounts(data.counts || {})
        setError(null)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!user) return
    fetchActivity()
  }, [user, fetchActivity])

  if (!user) return null

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Үйл ажиллагаа</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Холбогдсон нэвтрэлтийн сервисүүд болон нэвтрэлтийн түүх
          </p>
        </div>
        <button
          onClick={fetchActivity}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Шинэчлэх
        </button>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {PROVIDERS.map((provider) => {
          const connected = user.providers?.[provider.key] ?? false
          const count = counts[provider.method] || 0

          return (
            <Card key={provider.key}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={provider.color}>{provider.icon}</div>
                  <span className="font-medium text-sm text-slate-900 dark:text-white">
                    {provider.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant={connected ? 'success' : 'default'}>
                    {connected ? 'Холбогдсон' : 'Холбоогүй'}
                  </Badge>
                  {connected && count > 0 && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {count} нэвтрэлт
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Login History */}
      <Card>
        <CardHeader>
          <CardTitle>Нэвтрэлтийн түүх</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Ачааллаж байна...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && logins.length === 0 && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
              Нэвтрэлтийн түүх олдсонгүй
            </div>
          )}

          {!loading && logins.length > 0 && (
            <div className="space-y-2">
              {logins.map((entry) => (
                <LoginRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
