'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui'
import { api } from '@/lib/api'
import type { User } from '@/types'

function ConsentPageContent() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    api.auth
      .me()
      .then(setUser)
      .catch(() => {})
  }, [])

  const clientId = searchParams.get('client_id') || ''
  const redirectUri = searchParams.get('redirect_uri') || ''
  const scope = searchParams.get('scope') || 'openid profile'
  const state = searchParams.get('state') || ''
  const appName = searchParams.get('app_name') || 'Unknown App'
  const codeChallenge = searchParams.get('code_challenge') || ''
  const codeChallengeMethod = searchParams.get('code_challenge_method') || ''

  const handleAllow = () => {
    setIsLoading(true)

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      state,
      approve: 'true',
    })
    if (codeChallenge) {
      params.set('code_challenge', codeChallenge)
      params.set('code_challenge_method', codeChallengeMethod || 'plain')
    }

    window.location.href = `/api/oauth/authorize?${params.toString()}`
  }

  const handleDeny = () => {
    const sep = redirectUri.includes('?') ? '&' : '?'
    let denyUrl = `${redirectUri}${sep}error=access_denied`
    if (state) {
      denyUrl += `&state=${encodeURIComponent(state)}`
    }
    window.location.href = denyUrl
  }

  const g = user?.gerege
  const scopeItems = [
    { icon: '✉️', label: 'Имэйл хаяг', value: user?.email },
    { icon: '👤', label: 'Ургийн овог', value: g?.family_name },
    { icon: '👤', label: 'Овог', value: g?.last_name },
    { icon: '👤', label: 'Нэр', value: g?.first_name },
    { icon: '📅', label: 'Төрсөн огноо', value: g?.birth_date },
    { icon: '⚥', label: 'Хүйс', value: g?.gender },
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 bg-slate-50 dark:bg-slate-900">
      <div className="glass rounded-2xl p-10 w-full max-w-[460px] text-center">
        <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl">🛡️</span>
        </div>

        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
          Мэдээлэл хуваалцах
        </h2>

        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6">
          <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{appName}</span>{' '}
          байгууллага таны мэдээллийг ашиглахыг хүсэж байна. Та зөвшөөрөх үү?
        </p>

        <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-5 text-left mb-7">
          <h3 className="text-sm text-slate-500 dark:text-slate-400 mb-3 font-medium">
            Хуваалцах мэдээлэл:
          </h3>
          <div className="space-y-2">
            {scopeItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 py-2 border-b border-slate-200 dark:border-slate-700 last:border-0 text-sm"
              >
                <span className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                  <span className="text-indigo-500">{item.icon}</span>
                  {item.label}
                </span>
                <span className="text-slate-900 dark:text-white font-medium truncate max-w-[200px]">
                  {item.value || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="danger" className="flex-1" onClick={handleDeny}>
            Татгалзах
          </Button>
          <Button variant="primary" className="flex-1" onClick={handleAllow} isLoading={isLoading}>
            Зөвшөөрөх
          </Button>
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-5 leading-relaxed">
          Таны регистрийн дугаар болон иргэний дугаар хэзээ ч гуравдагч талд дамжуулагдахгүй.
        </p>
      </div>

      <footer className="mt-8 text-slate-400 dark:text-slate-500 text-xs">
        &copy; 2025 Gerege SSO
      </footer>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 bg-slate-50 dark:bg-slate-900">
      <div className="glass rounded-2xl p-10 w-full max-w-[460px] text-center">
        <div className="py-10">
          <div className="w-10 h-10 border-3 border-slate-200 dark:border-white/20 border-t-indigo-500 dark:border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 dark:text-white/60">Loading...</p>
        </div>
      </div>
    </div>
  )
}

export default function ConsentPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ConsentPageContent />
    </Suspense>
  )
}
