'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
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
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
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
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
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
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
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
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
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

export default function SecurityPage() {
  const { user, grants } = useAuthStore()
  const [logins, setLogins] = useState<LoginEntry[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const fetchActivity = useCallback(() => {
    setLoading(true)
    api.auth
      .loginActivity()
      .then((data) => {
        setLogins(data.logins || [])
        setCounts(data.counts || {})
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!user) return
    fetchActivity()
  }, [user, fetchActivity])

  if (!user) return null

  const connectedProviders = PROVIDERS.filter((p) => user.providers?.[p.key])
  const connectedCount = connectedProviders.length
  const recentLogins = logins.slice(0, 10)

  const checklist = [
    {
      label: 'Email баталгаажсан',
      done: true,
      description: 'OAuth нэвтрэлтээр баталгаажсан',
    },
    {
      label: 'ДАН иргэний баталгаажуулалт',
      done: user.verified,
      description: user.verified ? 'Баталгаажсан' : 'Баталгаажуулаагүй',
      href: user.verified ? undefined : '/dashboard/dan',
    },
    {
      label: 'Олон нэвтрэлтийн сервис холбогдсон',
      done: connectedCount >= 2,
      description: `${connectedCount} сервис холбогдсон`,
    },
    {
      label: 'Холбогдсон апп-уудыг шалгасан',
      done: true,
      description: `${grants.length} апп холбогдсон`,
      href: '/dashboard',
    },
  ]

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Аюулгүй байдал</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Таны бүртгэлийн аюулгүй байдлын тойм ба тохиргоо
        </p>
      </div>

      {/* Section 1: Security Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">
            <svg
              className="w-5 h-5 text-emerald-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Аюулгүй байдлын шалгах хуудас
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {checklist.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="flex items-center gap-3">
                  {item.done ? (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-amber-600 dark:text-amber-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M12 9v2m0 4h.01"
                        />
                      </svg>
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-sm text-slate-900 dark:text-white">
                      {item.label}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {item.description}
                    </div>
                  </div>
                </div>
                {item.href && (
                  <Link
                    href={item.href}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Шийдвэрлэх →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Connected Login Providers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">
            <svg
              className="w-5 h-5 text-indigo-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            Нэвтрэлтийн сервисүүд
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {PROVIDERS.map((provider) => {
              const connected = user.providers?.[provider.key] ?? false
              const count = counts[provider.method] || 0

              return (
                <div
                  key={provider.key}
                  className={`p-4 rounded-xl border transition-colors ${
                    connected
                      ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className={provider.color}>{provider.icon}</div>
                    <span className="font-medium text-sm text-slate-900 dark:text-white">
                      {provider.name}
                    </span>
                  </div>
                  <Badge variant={connected ? 'success' : 'default'} className="mb-2">
                    {connected ? 'Холбогдсон' : 'Холбоогүй'}
                  </Badge>
                  {connected && (
                    <div className="mt-2 space-y-1">
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {user.email}
                      </div>
                      {count > 0 && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {count} нэвтрэлт
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Recent Security Events */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle className="text-slate-900 dark:text-white">
              <svg
                className="w-5 h-5 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Сүүлийн нэвтрэлтүүд
            </CardTitle>
            <Link
              href="/dashboard/activity"
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Бүгдийг харах →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-center py-6">
              <div className="w-6 h-6 border-2 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Ачааллаж байна...</p>
            </div>
          )}

          {!loading && recentLogins.length === 0 && (
            <div className="text-center py-6 text-sm text-slate-500 dark:text-slate-400">
              Нэвтрэлтийн түүх олдсонгүй
            </div>
          )}

          {!loading && recentLogins.length > 0 && (
            <div className="space-y-2">
              {recentLogins.map((entry) => {
                const method = getMethodFromDetails(entry.details)
                const provider = getProviderFromMethod(method)

                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div className={`shrink-0 ${provider?.color || 'text-slate-400'}`}>
                      {provider?.icon || (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
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
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        IP: {entry.ip_address}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                      {formatDateTime(entry.created_at)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">
            <svg
              className="w-5 h-5 text-amber-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            Зөвлөмжүүд
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {connectedCount < 2 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                <svg
                  className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <div className="font-medium text-sm text-amber-800 dark:text-amber-300">
                    Нэмэлт нэвтрэх арга холбоно уу
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    Нэг нэвтрэлтийн сервис ашиглаж байна. Нөөц нэвтрэх аргатай болохын тулд нэмэлт
                    сервис холбоно уу.
                  </p>
                </div>
              </div>
            )}

            {!user.verified && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                <svg
                  className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <div className="font-medium text-sm text-amber-800 dark:text-amber-300">
                    ДАН баталгаажуулалт хийнэ үү
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    Иргэний баталгаажуулалт хийснээр таны данс бүрэн хамгаалагдана.{' '}
                    <Link href="/dashboard/dan" className="underline font-medium">
                      Баталгаажуулах →
                    </Link>
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <svg
                className="w-5 h-5 text-slate-400 shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <div className="font-medium text-sm text-slate-700 dark:text-slate-300">
                  Холбогдсон апп-уудаа тогтмол шалгаарай
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Таны мэдээлэлд хандах эрхтэй аппликейшнүүдыг{' '}
                  <Link
                    href="/dashboard"
                    className="text-indigo-600 dark:text-indigo-400 underline font-medium"
                  >
                    дашбоард
                  </Link>
                  -аас шалгана уу.
                </p>
              </div>
            </div>

            {connectedCount >= 2 && user.verified && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                <svg
                  className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <div>
                  <div className="font-medium text-sm text-emerald-800 dark:text-emerald-300">
                    Таны данс сайн хамгаалагдсан байна
                  </div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                    ДАН баталгаажсан, олон нэвтрэлтийн сервис холбогдсон.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
