'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuthStore } from '@/stores/authStore'
import { useTranslation } from '@/stores/settingsStore'
import { api } from '@/lib/api'
import { Button, Input } from '@/components/ui'

export default function RegisterPage() {
  const router = useRouter()
  const { token, user, fetchUser, logout } = useAuthStore()
  const t = useTranslation()

  const [regNo, setRegNo] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    if (!token) {
      router.replace('/')
      return
    }

    if (user?.verified) {
      router.replace('/dashboard')
    }
  }, [token, user, router])

  const handleVerify = async () => {
    const trimmedRegNo = regNo.trim().toUpperCase()
    if (!trimmedRegNo) {
      setError('Регистрийн дугаар оруулна уу')
      return
    }

    setIsVerifying(true)
    setError('')
    setSuccess('')

    try {
      await api.auth.verify(trimmedRegNo)
      setSuccess('Амжилттай баталгаажлаа!')
      setTimeout(() => {
        fetchUser().then(() => {
          const redirect = localStorage.getItem('oauth_redirect') || '/dashboard'
          localStorage.removeItem('oauth_redirect')
          if (redirect.startsWith('/api/')) {
            window.location.href = redirect
          } else {
            router.replace(redirect)
          }
        })
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.replace('/')
  }

  if (!token || user?.verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-10 h-10 border-3 border-slate-200 dark:border-white/20 border-t-indigo-500 dark:border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-slate-50 dark:bg-slate-900">
      <div className="glass rounded-2xl p-10 w-full max-w-[420px] text-center">
        <div className="mb-5">
          <Image
            src="/assets/logo.svg"
            alt="Gerege SSO"
            width={80}
            height={80}
            className="mx-auto"
            priority
          />
        </div>

        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 text-3xl flex items-center justify-center mx-auto mb-5">
          ✓
        </div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-5">
          Амжилттай нэвтэрлээ!
        </h2>

        {user && (
          <div className="bg-slate-100 dark:bg-white/5 rounded-xl p-4 text-left mb-5">
            <div className="flex justify-between py-2 border-b border-slate-200 dark:border-white/10">
              <span className="text-slate-500 dark:text-white/60 text-sm">Gen ID:</span>
              <span className="font-medium text-sm text-slate-900 dark:text-white">
                {user.gen_id}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500 dark:text-white/60 text-sm">И-мэйл:</span>
              <span className="font-medium text-sm text-slate-900 dark:text-white">
                {user.email}
              </span>
            </div>
          </div>
        )}

        <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-xl p-5 text-left mb-5">
          <h3 className="font-medium text-slate-900 dark:text-white mb-2">{t.registerTitle}</h3>
          <p className="text-sm text-slate-600 dark:text-white/70 mb-3">{t.registerDescription}</p>
          <div className="flex gap-2">
            <Input
              placeholder={t.registerPlaceholder}
              value={regNo}
              onChange={(e) => setRegNo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              maxLength={12}
              className="flex-1"
            />
            <Button
              variant="primary"
              onClick={handleVerify}
              isLoading={isVerifying}
              className="bg-orange-500 from-orange-500 to-orange-500"
            >
              {t.registerButton}
            </Button>
          </div>
          {error && (
            <div className="mt-3 p-3 bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-3 p-3 bg-green-100 dark:bg-green-500/20 border border-green-200 dark:border-green-500/50 rounded-lg text-green-600 dark:text-green-400 text-sm">
              {success}
            </div>
          )}
        </div>

        <Button variant="danger" className="w-full" onClick={handleLogout}>
          {t.registerLogout}
        </Button>
      </div>
    </div>
  )
}
