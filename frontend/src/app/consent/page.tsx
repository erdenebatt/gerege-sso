'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui'
import { api } from '@/lib/api'

export default function ConsentPage() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)

  const clientId = searchParams.get('client_id') || ''
  const redirectUri = searchParams.get('redirect_uri') || ''
  const scope = searchParams.get('scope') || 'openid profile'
  const state = searchParams.get('state') || ''
  const appName = searchParams.get('app_name') || 'Unknown App'
  const codeChallenge = searchParams.get('code_challenge') || ''
  const codeChallengeMethod = searchParams.get('code_challenge_method') || ''

  const handleAllow = async () => {
    setIsLoading(true)

    try {
      const result = await api.oauth.authorize({
        clientId,
        redirectUri,
        scope,
        state,
        approve: true,
        codeChallenge,
        codeChallengeMethod,
      })

      if (result.redirect) {
        window.location.href = result.redirect
      }
    } catch (err) {
      alert('Алдаа гарлаа. Дахин оролдоно уу.')
      setIsLoading(false)
    }
  }

  const handleDeny = () => {
    const sep = redirectUri.includes('?') ? '&' : '?'
    let denyUrl = `${redirectUri}${sep}error=access_denied`
    if (state) {
      denyUrl += `&state=${encodeURIComponent(state)}`
    }
    window.location.href = denyUrl
  }

  const scopeItems = [
    { icon: '✉️', label: 'Имэйл хаяг (Email)' },
    { icon: '👤', label: 'Ургийн овог (Family name)' },
    { icon: '👤', label: 'Овог (Last name)' },
    { icon: '👤', label: 'Нэр (First name)' },
    { icon: '📅', label: 'Төрсөн огноо (Birth date)' },
    { icon: '⚥', label: 'Хүйс (Gender)' },
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5">
      <div className="glass rounded-2xl p-10 w-full max-w-[460px] text-center">
        <div className="w-16 h-16 rounded-full bg-gerege-primary/15 flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl">🛡️</span>
        </div>

        <h2 className="text-xl font-semibold mb-4">Мэдээлэл хуваалцах</h2>

        <p className="text-white/85 text-sm leading-relaxed mb-6">
          <span className="text-gerege-primary font-semibold">{appName}</span>{' '}
          байгууллага таны мэдээллийг ашиглахыг хүсэж байна. Та зөвшөөрөх үү?
        </p>

        <div className="bg-white/5 rounded-xl p-5 text-left mb-7">
          <h3 className="text-sm text-white/60 mb-3 font-medium">
            Хуваалцах мэдээлэл:
          </h3>
          <div className="space-y-2">
            {scopeItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 py-2 border-b border-white/10 last:border-0 text-sm text-white/80"
              >
                <span className="text-gerege-primary">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="danger"
            className="flex-1 bg-red-500/15 border-red-500/40"
            onClick={handleDeny}
          >
            Татгалзах
          </Button>
          <Button
            variant="primary"
            className="flex-1 bg-gerege-primary from-gerege-primary to-gerege-primary"
            onClick={handleAllow}
            isLoading={isLoading}
          >
            Зөвшөөрөх
          </Button>
        </div>

        <p className="text-[11px] text-white/35 mt-5 leading-relaxed">
          Таны регистрийн дугаар болон иргэний дугаар хэзээ ч гуравдагч талд
          дамжуулагдахгүй.
        </p>
      </div>

      <footer className="mt-8 text-white/40 text-xs">
        &copy; 2025 Gerege SSO
      </footer>
    </div>
  )
}
