'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui'
import { formatDateTime } from '@/lib/utils'
import type { PasskeyInfo } from '@/types'

interface PasskeySetupProps {
  onComplete: () => void
}

export function PasskeySetup({ onComplete }: PasskeySetupProps) {
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRegistering, setIsRegistering] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchPasskeys = useCallback(async () => {
    try {
      const data = await api.mfa.listPasskeys()
      setPasskeys(data.passkeys || [])
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPasskeys()
  }, [fetchPasskeys])

  const handleRegister = async () => {
    setIsRegistering(true)
    setError('')
    setSuccess('')
    try {
      const { startRegistration } = await import('@simplewebauthn/browser')
      const options: any = await api.mfa.passkeyRegisterBegin()
      const regResp = await startRegistration({
        optionsJSON: (options.publicKey ?? options) as any,
      })
      await api.mfa.passkeyRegisterFinish(regResp)
      setSuccess('Passkey амжилттай бүртгэгдлээ!')
      fetchPasskeys()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passkey бүртгэхэд алдаа гарлаа')
    } finally {
      setIsRegistering(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setError('')
    try {
      await api.mfa.deletePasskey(id)
      setPasskeys((prev) => prev.filter((p) => p.id !== id))
      setSuccess('Passkey устгагдлаа')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Устгахад алдаа гарлаа')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Passkey</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Fingerprint, Face ID, эсвэл Security Key ашиглан нэвтрэх
          </p>
        </div>
        <Button variant="primary" onClick={handleRegister} isLoading={isRegistering}>
          Нэмэх
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/50 rounded-lg text-emerald-600 dark:text-emerald-400 text-sm">
          {success}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-6">
          <div className="w-6 h-6 border-2 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Ачааллаж байна...</p>
        </div>
      ) : passkeys.length === 0 ? (
        <div className="text-center py-6 text-sm text-slate-500 dark:text-slate-400">
          Бүртгэлтэй Passkey байхгүй
        </div>
      ) : (
        <div className="space-y-2">
          {passkeys.map((pk) => (
            <div
              key={pk.id}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-indigo-600 dark:text-indigo-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-sm text-slate-900 dark:text-white">
                    {pk.credential_name || 'Passkey'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Бүртгэсэн: {formatDateTime(pk.created_at)}
                    {pk.last_used_at && ` | Сүүлд: ${formatDateTime(pk.last_used_at)}`}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(pk.id)}
                disabled={deletingId === pk.id}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
              >
                {deletingId === pk.id ? (
                  <div className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      <Button variant="ghost" className="w-full" onClick={onComplete}>
        Буцах
      </Button>
    </div>
  )
}
