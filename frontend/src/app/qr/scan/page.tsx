'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { api } from '@/lib/api'
import { getToken } from '@/lib/auth'

function QRScanContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session')
  const token = getToken()

  const [status, setStatus] = useState<
    'loading' | 'no-session' | 'not-logged-in' | 'ready' | 'approving' | 'approved' | 'error'
  >('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setStatus('no-session')
      return
    }

    if (!token) {
      setStatus('not-logged-in')
      return
    }

    // Mark session as scanned
    api.mfa.markQRScanned(sessionId).catch(() => {
      // Ignore errors — session might already be scanned
    })

    setStatus('ready')
  }, [sessionId, token])

  const handleApprove = async () => {
    if (!sessionId) return
    setStatus('approving')
    setError(null)
    try {
      await api.mfa.approveQR(sessionId)
      setStatus('approved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Зөвшөөрөхөд алдаа гарлаа')
      setStatus('ready')
    }
  }

  const handleLogin = () => {
    // Save session param so we can return after login
    if (sessionId) {
      localStorage.setItem('qr_scan_session', sessionId)
    }
    router.push('/')
  }

  // On mount, check if we're returning from login with a saved session
  useEffect(() => {
    if (token && !sessionId) {
      const savedSession = localStorage.getItem('qr_scan_session')
      if (savedSession) {
        localStorage.removeItem('qr_scan_session')
        router.replace(`/qr/scan?session=${savedSession}`)
      }
    }
  }, [token, sessionId, router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl p-8 text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <Image
            src="/assets/logo.png"
            alt="Gerege SSO"
            width={40}
            height={40}
            className="rounded-xl"
            priority
          />
          <div className="text-left">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">GEREGE SSO</h1>
            <p className="text-xs text-blue-600 dark:text-blue-400">QR нэвтрэлт</p>
          </div>
        </div>

        {status === 'loading' && (
          <div className="py-8">
            <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Шалгаж байна...</p>
          </div>
        )}

        {status === 'no-session' && (
          <div className="py-8">
            <svg
              className="w-12 h-12 text-red-400 mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">QR session олдсонгүй</p>
            <p className="text-xs text-slate-400">QR кодыг дахин скан хийнэ үү.</p>
          </div>
        )}

        {status === 'not-logged-in' && (
          <div className="py-6">
            <svg
              className="w-12 h-12 text-amber-400 mx-auto mb-3"
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
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              QR нэвтрэлтийг зөвшөөрөхийн тулд эхлээд нэвтэрнэ үү.
            </p>
            <button
              onClick={handleLogin}
              className="w-full px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors text-sm"
            >
              Нэвтрэх
            </button>
          </div>
        )}

        {status === 'ready' && (
          <div className="py-6">
            <svg
              className="w-12 h-12 text-indigo-500 mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
              Компьютер дээрээ нэвтрэх гэж байна
            </p>
            <p className="text-xs text-slate-400 mb-6">Энэ нэвтрэлтийг зөвшөөрөх үү?</p>

            {error && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg mb-4 text-xs">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleApprove}
                className="w-full px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors text-sm"
              >
                Зөвшөөрөх
              </button>
              <button
                onClick={() => window.close()}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-sm"
              >
                Цуцлах
              </button>
            </div>
          </div>
        )}

        {status === 'approving' && (
          <div className="py-8">
            <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Зөвшөөрч байна...</p>
          </div>
        )}

        {status === 'approved' && (
          <div className="py-8">
            <svg
              className="w-12 h-12 text-green-500 mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
              Нэвтрэлт зөвшөөрөгдлөө
            </p>
            <p className="text-xs text-slate-400">
              Компьютер дээрээ автоматаар нэвтэрнэ. Энэ цонхыг хааж болно.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function QRScanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      }
    >
      <QRScanContent />
    </Suspense>
  )
}
