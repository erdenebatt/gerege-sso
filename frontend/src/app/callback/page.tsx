'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import { Button, Input } from '@/components/ui'

type ViewState = 'loading' | 'success' | 'error' | 'pending_link' | 'verify'

function CallbackPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { token, user, setToken, fetchUser, logout } = useAuthStore()

  const [view, setView] = useState<ViewState>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [pendingGenId, setPendingGenId] = useState<string | null>(null)

  // Verification form state
  const [regNo, setRegNo] = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [verifySuccess, setVerifySuccess] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    const handleCallback = async () => {
      const urlToken = searchParams.get('token')
      const existing = searchParams.get('existing')
      const pendingLink = searchParams.get('pending_link')
      const genId = searchParams.get('gen_id')

      // Pending account link - show verification form
      if (pendingLink === 'true' && genId) {
        setPendingGenId(genId)
        setView('pending_link')
        return
      }

      // New login - store token
      if (urlToken) {
        setToken(urlToken)
        // Clean URL
        window.history.replaceState({}, document.title, '/callback')
        const userData = await fetchUser()
        if (userData) {
          setView(userData.verified ? 'success' : 'verify')
        } else {
          setErrorMessage('Хэрэглэгчийн мэдээлэл олдсонгүй')
          setView('error')
        }
        return
      }

      // Existing session
      if (existing || token) {
        const userData = await fetchUser()
        if (userData) {
          setView(userData.verified ? 'success' : 'verify')
        } else {
          setErrorMessage('Токен хүчингүй болсон')
          setView('error')
        }
        return
      }

      // No token found
      setErrorMessage('Нэвтрэлтийн токен олдсонгүй')
      setView('error')
    }

    handleCallback()
  }, [searchParams, token, setToken, fetchUser])

  const handleVerify = async () => {
    const trimmedRegNo = regNo.trim().toUpperCase()
    if (!trimmedRegNo) {
      setVerifyError('Регистрийн дугаар оруулна уу')
      return
    }

    setIsVerifying(true)
    setVerifyError('')
    setVerifySuccess('')

    try {
      await api.auth.verify(trimmedRegNo)
      setVerifySuccess('Амжилттай баталгаажлаа!')
      setTimeout(() => {
        fetchUser()
        setView('success')
      }, 1500)
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Алдаа гарлаа')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleConfirmLink = async () => {
    const trimmedRegNo = regNo.trim().toUpperCase()
    if (!trimmedRegNo || !pendingGenId) {
      setVerifyError('Регистрийн дугаар оруулна уу')
      return
    }

    setIsVerifying(true)
    setVerifyError('')
    setVerifySuccess('')

    try {
      const data = await api.auth.confirmLink(pendingGenId, trimmedRegNo)
      setToken(data.token)
      setVerifySuccess('Бүртгэл амжилттай холбогдлоо!')
      setTimeout(() => {
        fetchUser()
        setView('success')
      }, 1500)
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Алдаа гарлаа')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.replace('/')
  }

  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token)
      alert('Токен хуулагдлаа!')
    }
  }

  const truncatedToken = token
    ? token.length > 50
      ? token.substring(0, 50) + '...'
      : token
    : ''

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

        {/* Loading */}
        {view === 'loading' && (
          <div className="py-10">
            <div className="w-10 h-10 border-3 border-slate-200 dark:border-white/20 border-t-indigo-500 dark:border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 dark:text-white/60">Уншиж байна...</p>
          </div>
        )}

        {/* Success */}
        {view === 'success' && user && (
          <div className="py-5">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 text-3xl flex items-center justify-center mx-auto mb-5">
              ✓
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-5">Амжилттай нэвтэрлээ!</h2>

            <div className="bg-slate-100 dark:bg-white/5 rounded-xl p-4 text-left mb-5">
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-white/10">
                <span className="text-slate-500 dark:text-white/60 text-sm">Gen ID:</span>
                <span className="font-medium text-sm text-slate-900 dark:text-white">{user.gen_id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-white/10">
                <span className="text-slate-500 dark:text-white/60 text-sm">И-мэйл:</span>
                <span className="font-medium text-sm text-slate-900 dark:text-white">{user.email}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500 dark:text-white/60 text-sm">Баталгаажсан:</span>
                <span
                  className={`font-medium text-sm ${user.verified ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}
                >
                  {user.verified ? 'Тийм' : 'Үгүй'}
                </span>
              </div>
              {user.gerege?.name && (
                <div className="flex justify-between py-2 border-t border-slate-200 dark:border-white/10">
                  <span className="text-slate-500 dark:text-white/60 text-sm">Нэр:</span>
                  <span className="font-medium text-sm text-slate-900 dark:text-white">{user.gerege.name}</span>
                </div>
              )}
            </div>

            <div className="bg-slate-100 dark:bg-black/20 rounded-lg p-3 text-left mb-5">
              <label className="text-xs text-slate-500 dark:text-white/60 mb-2 block">JWT Token:</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-xs text-indigo-600 dark:text-gerege-primary bg-indigo-50 dark:bg-gerege-primary/10 p-2 rounded break-all">
                  {truncatedToken}
                </code>
                <button
                  onClick={copyToken}
                  className="p-2 bg-slate-200 dark:bg-white/10 rounded hover:bg-slate-300 dark:hover:bg-white/20 transition-colors text-slate-600 dark:text-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => router.push('/dashboard')}
              >
                Хянах самбар руу
              </Button>
              <Button variant="danger" className="w-full" onClick={handleLogout}>
                Гарах
              </Button>
            </div>
          </div>
        )}

        {/* Verification */}
        {view === 'verify' && (
          <div className="py-5">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 text-3xl flex items-center justify-center mx-auto mb-5">
              ✓
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-5">Амжилттай нэвтэрлээ!</h2>

            {user && (
              <div className="bg-slate-100 dark:bg-white/5 rounded-xl p-4 text-left mb-5">
                <div className="flex justify-between py-2 border-b border-slate-200 dark:border-white/10">
                  <span className="text-slate-500 dark:text-white/60 text-sm">Gen ID:</span>
                  <span className="font-medium text-sm text-slate-900 dark:text-white">{user.gen_id}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500 dark:text-white/60 text-sm">И-мэйл:</span>
                  <span className="font-medium text-sm text-slate-900 dark:text-white">{user.email}</span>
                </div>
              </div>
            )}

            <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-xl p-5 text-left mb-5">
              <h3 className="font-medium text-slate-900 dark:text-white mb-2">Иргэний баталгаажуулалт</h3>
              <p className="text-sm text-slate-600 dark:text-white/70 mb-3">
                Регистрийн дугаараа оруулж баталгаажуулна уу:
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="АА00112233"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  maxLength={12}
                  className="flex-1"
                />
                <Button
                  variant="primary"
                  onClick={handleVerify}
                  isLoading={isVerifying}
                  className="bg-orange-500 from-orange-500 to-orange-500"
                >
                  Баталгаажуулах
                </Button>
              </div>
              {verifyError && (
                <div className="mt-3 p-3 bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 rounded-lg text-red-600 dark:text-red-400 text-sm">
                  {verifyError}
                </div>
              )}
              {verifySuccess && (
                <div className="mt-3 p-3 bg-green-100 dark:bg-green-500/20 border border-green-200 dark:border-green-500/50 rounded-lg text-green-600 dark:text-green-400 text-sm">
                  {verifySuccess}
                </div>
              )}
            </div>

            <Button variant="danger" className="w-full" onClick={handleLogout}>
              Гарах
            </Button>
          </div>
        )}

        {/* Pending Link */}
        {view === 'pending_link' && (
          <div className="py-5">
            <div className="text-4xl mb-5">🔗</div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Бүртгэл холбох</h2>
            <p className="text-sm text-slate-600 dark:text-white/70 mb-5 leading-relaxed">
              Энэ и-мэйл хаягаар өмнө бүртгэл үүссэн байна. Бүртгэлүүдийг
              холбохын тулд регистрийн дугаараа оруулж баталгаажуулна уу:
            </p>

            <div className="flex gap-2 mb-4">
              <Input
                placeholder="АА00112233"
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                maxLength={12}
                className="flex-1"
              />
              <Button
                variant="primary"
                onClick={handleConfirmLink}
                isLoading={isVerifying}
                className="bg-orange-500 from-orange-500 to-orange-500"
              >
                Холбох
              </Button>
            </div>

            {verifyError && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {verifyError}
              </div>
            )}
            {verifySuccess && (
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-500/20 border border-green-200 dark:border-green-500/50 rounded-lg text-green-600 dark:text-green-400 text-sm">
                {verifySuccess}
              </div>
            )}

            <p className="text-xs text-slate-400 dark:text-white/50">
              Хэрэв энэ таны бүртгэл биш бол{' '}
              <Link href="/" className="text-indigo-600 dark:text-gerege-secondary hover:underline">
                буцах
              </Link>
            </p>
          </div>
        )}

        {/* Error */}
        {view === 'error' && (
          <div className="py-5">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-3xl flex items-center justify-center mx-auto mb-5">
              ✗
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Алдаа гарлаа</h2>
            <p className="text-slate-600 dark:text-white/70 mb-5">{errorMessage}</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-indigo-600 dark:bg-white text-white dark:text-slate-900 rounded-xl font-medium hover:-translate-y-0.5 hover:shadow-lg transition-all"
            >
              Дахин оролдох
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-slate-50 dark:bg-slate-900">
      <div className="glass rounded-2xl p-10 w-full max-w-[420px] text-center">
        <div className="py-10">
          <div className="w-10 h-10 border-3 border-slate-200 dark:border-white/20 border-t-indigo-500 dark:border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 dark:text-white/60">Loading...</p>
        </div>
      </div>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CallbackPageContent />
    </Suspense>
  )
}
