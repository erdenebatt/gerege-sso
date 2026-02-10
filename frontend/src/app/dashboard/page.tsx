'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardHeader, CardTitle, CardContent, Button, useToast } from '@/components/ui'
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui'
import {
  VerificationProgress,
  IdentityCard,
  SecurityCard,
  GrantCard,
  FaceVerifyModal,
} from '@/components/dashboard'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import { getVerificationLevel } from '@/lib/utils'
import type { LoginEntry } from '@/types'

const LOGIN_PROVIDERS = [
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

export default function DashboardPage() {
  const { user, grants, revokeGrant } = useAuthStore()
  const { showToast } = useToast()

  const [faceModalOpen, setFaceModalOpen] = useState(false)
  const [revokeModalOpen, setRevokeModalOpen] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<{
    id: string
    name: string
  } | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)

  const [logins, setLogins] = useState<LoginEntry[]>([])
  const [loginCounts, setLoginCounts] = useState<Record<string, number>>({})
  const [loginLoading, setLoginLoading] = useState(true)

  const fetchLoginActivity = useCallback(() => {
    setLoginLoading(true)
    api.auth
      .loginActivity()
      .then((data) => {
        setLogins(data.logins || [])
        setLoginCounts(data.counts || {})
      })
      .catch(() => {})
      .finally(() => setLoginLoading(false))
  }, [])

  useEffect(() => {
    if (!user) return
    fetchLoginActivity()
  }, [user, fetchLoginActivity])

  // Layout handles user fetching and loading state
  if (!user) return null

  const verificationLevel = getVerificationLevel(user)

  const handleVerifyPhone = () => {
    showToast('Утасны баталгаажуулалт удахгүй...', 'info')
  }

  // Handle DAN verification navigation if needed, or just let Link handle it?
  // VerificationProgress component likely calls this callback.
  // We can just redirect.
  const handleVerifyDan = () => {
    // use router? Or just let the component handle link if we pass href?
    // VerificationProgress takes onVerifyDan prop.
    // In original page: router.push('/dashboard/dan')
    window.location.href = '/dashboard/dan' // or use router
  }

  const handleOpenRevoke = (grantId: string, clientName: string) => {
    setRevokeTarget({ id: grantId, name: clientName })
    setRevokeModalOpen(true)
  }

  const handleConfirmRevoke = async () => {
    if (!revokeTarget) return

    setIsRevoking(true)
    const success = await revokeGrant(revokeTarget.id)
    setIsRevoking(false)

    if (success) {
      showToast('Эрх амжилттай цуцлагдлаа', 'success')
    } else {
      showToast('Алдаа гарлаа', 'error')
    }

    setRevokeModalOpen(false)
    setRevokeTarget(null)
  }

  const handleCopy = () => {
    showToast('Хуулагдлаа', 'success')
  }

  const handleFaceSuccess = () => {
    showToast('Царай таних амжилттай', 'success')
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Сайн байна уу,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
            {user.gerege?.name || user.email?.split('@')[0] || 'Хэрэглэгч'}
          </span>
        </h2>
        <p className="text-slate-500 dark:text-slate-400">Таны Gerege дижитал иргэний данс</p>
      </div>

      {/* Verification Progress */}
      <div className="mb-8">
        <VerificationProgress
          level={verificationLevel}
          onVerifyPhone={handleVerifyPhone}
          onVerifyDan={handleVerifyDan}
        />
      </div>

      {/* Identity & Security Cards */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <IdentityCard user={user} onCopy={handleCopy} />
        <SecurityCard user={user} />
      </div>

      {/* Login Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">
            <svg
              className="w-5 h-5 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              />
            </svg>
            Нэвтрэлтийн мэдээлэл
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loginLoading ? (
            <div className="text-center py-6">
              <div className="w-6 h-6 border-2 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Ачааллаж байна...</p>
            </div>
          ) : (
            <>
              {/* Active session / current login detail */}
              {logins.length > 0 &&
                (() => {
                  const lastLogin = logins[0]
                  const method = getMethodFromDetails(lastLogin.details)
                  const provider = LOGIN_PROVIDERS.find((p) => p.method === method)
                  let parsedDetails: Record<string, string> = {}
                  try {
                    parsedDetails = JSON.parse(lastLogin.details)
                  } catch {
                    /* empty */
                  }
                  const loginEmail = parsedDetails.email || user.email
                  const userAgent = parsedDetails.user_agent || ''

                  // Parse user agent for display
                  let browserInfo = ''
                  if (userAgent) {
                    if (userAgent.includes('Chrome') && !userAgent.includes('Edg'))
                      browserInfo = 'Chrome'
                    else if (userAgent.includes('Firefox')) browserInfo = 'Firefox'
                    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome'))
                      browserInfo = 'Safari'
                    else if (userAgent.includes('Edg')) browserInfo = 'Edge'
                    else browserInfo = 'Бусад'

                    if (userAgent.includes('Windows')) browserInfo += ' · Windows'
                    else if (userAgent.includes('Mac OS')) browserInfo += ' · macOS'
                    else if (userAgent.includes('Linux')) browserInfo += ' · Linux'
                    else if (userAgent.includes('Android')) browserInfo += ' · Android'
                    else if (userAgent.includes('iPhone') || userAgent.includes('iPad'))
                      browserInfo += ' · iOS'
                  }

                  return (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 border border-indigo-100 dark:border-indigo-500/20 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          Идэвхтэй нэвтрэлт
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mb-3">
                        <div
                          className={`w-12 h-12 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm ${provider?.color || 'text-slate-400'}`}
                        >
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
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {provider?.name || 'Нэвтрэлт'} -аар нэвтэрсэн
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-300 truncate">
                            {loginEmail}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
                          <svg
                            className="w-4 h-4 text-slate-400 shrink-0"
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
                          <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                            {formatDateTime(lastLogin.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
                          <svg
                            className="w-4 h-4 text-slate-400 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                            />
                          </svg>
                          <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                            IP: {lastLogin.ip_address}
                          </span>
                        </div>
                        {browserInfo && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
                            <svg
                              className="w-4 h-4 text-slate-400 shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                              />
                            </svg>
                            <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                              {browserInfo}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}

              {/* Total + per-provider counts */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-center border border-indigo-100 dark:border-indigo-500/20">
                  <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    {Object.values(loginCounts).reduce((a, b) => a + b, 0)}
                  </div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                    Нийт нэвтрэлт
                  </div>
                </div>
                {LOGIN_PROVIDERS.map((provider) => {
                  const count = loginCounts[provider.method] || 0
                  const connected = user.providers?.[provider.key] ?? false
                  return (
                    <div
                      key={provider.key}
                      className={`p-4 rounded-xl text-center border transition-colors ${
                        connected && count > 0
                          ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                          : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 opacity-50'
                      }`}
                    >
                      <div className="flex justify-center mb-2">
                        <div className={provider.color}>{provider.icon}</div>
                      </div>
                      <div className="text-xl font-bold text-slate-900 dark:text-white">
                        {count}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {provider.name}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Connected Apps (Grants) */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
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
            Холбогдсон аппликейшнүүд
          </h3>
          <span className="text-sm text-slate-400 dark:text-slate-500">{grants.length} апп</span>
        </div>

        {grants.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-slate-400 dark:text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              Одоогоор ямар ч апп холбогдоогүй байна
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
              Гуравдагч аппликейшнүүд таны зөвшөөрлөөр холбогдох болно
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {grants.map((grant) => (
              <GrantCard key={grant.id} grant={grant} onRevoke={handleOpenRevoke} />
            ))}
          </div>
        )}
      </Card>

      {/* Face Verify Modal */}
      <FaceVerifyModal
        isOpen={faceModalOpen}
        onClose={() => setFaceModalOpen(false)}
        onSuccess={handleFaceSuccess}
      />

      {/* Revoke Confirmation Modal */}
      <Modal isOpen={revokeModalOpen} onClose={() => setRevokeModalOpen(false)} size="sm">
        <ModalHeader>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-400"
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
          </div>
          <ModalTitle>Эрх цуцлах уу?</ModalTitle>
          <ModalDescription>
            &quot;{revokeTarget?.name}&quot; апп таны мэдээлэлд хандах эрхгүй болно.
          </ModalDescription>
        </ModalHeader>

        <ModalFooter>
          <Button variant="secondary" className="flex-1" onClick={() => setRevokeModalOpen(false)}>
            Болих
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={handleConfirmRevoke}
            isLoading={isRevoking}
          >
            Эрх цуцлах
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
