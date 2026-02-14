'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui'

interface RecoveryCodesProps {
  onComplete: () => void
}

export function RecoveryCodes({ onComplete }: RecoveryCodesProps) {
  const [codes, setCodes] = useState<unknown[]>([])
  const [remaining, setRemaining] = useState(0)
  const [total, setTotal] = useState(0)
  const [newCodes, setNewCodes] = useState<string[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [copiedCodes, setCopiedCodes] = useState(false)

  useEffect(() => {
    api.mfa
      .getRecoveryCodes()
      .then((data) => {
        setCodes(data.codes || [])
        setRemaining(data.remaining)
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    setError('')
    try {
      const data = await api.mfa.regenerateCodes()
      setNewCodes(data.codes)
      setRemaining(data.codes.length)
      setTotal(data.codes.length)
      setShowConfirm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Шинэ код үүсгэхэд алдаа гарлаа')
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleCopyCodes = () => {
    if (newCodes) {
      navigator.clipboard.writeText(newCodes.join('\n'))
      setCopiedCodes(true)
      setTimeout(() => setCopiedCodes(false), 2000)
    }
  }

  const handleDownloadCodes = () => {
    if (newCodes) {
      const text = `Gerege SSO - Recovery Codes\n${'='.repeat(30)}\n\n${newCodes.join('\n')}\n\nЭдгээр кодуудыг аюулгүй газар хадгална уу.\nКод бүр зөвхөн нэг удаа ашиглагдана.`
      const blob = new Blob([text], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'gerege-recovery-codes.txt'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-6">
        <div className="w-6 h-6 border-2 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500 dark:text-slate-400">Ачааллаж байна...</p>
      </div>
    )
  }

  // Show newly generated codes
  if (newCodes) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-emerald-600 dark:text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
            Шинэ Recovery кодууд
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Эдгээр кодуудыг аюулгүй газар хадгална уу:
          </p>
        </div>

        <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4">
          <div className="grid grid-cols-2 gap-2">
            {newCodes.map((c, i) => (
              <div
                key={i}
                className="font-mono text-sm text-slate-900 dark:text-white text-center py-1 bg-white dark:bg-slate-700 rounded"
              >
                {c}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-3">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Хуучин кодууд устгагдсан. Эдгээр шинэ кодуудыг зөвхөн нэг удаа харуулна.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={handleCopyCodes}>
            {copiedCodes ? 'Хуулагдлаа!' : 'Хуулах'}
          </Button>
          <Button variant="secondary" className="flex-1" onClick={handleDownloadCodes}>
            Татах
          </Button>
        </div>

        <Button variant="primary" className="w-full" onClick={onComplete}>
          Дуусгах
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white">Recovery кодууд</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Authenticator апп-д хандах боломжгүй тохиолдолд ашиглах нөөц кодууд
        </p>
      </div>

      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-600 dark:text-slate-300">Үлдсэн кодууд</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {remaining} / {total}
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              remaining <= 2 ? 'bg-red-500' : remaining <= 5 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: total > 0 ? `${(remaining / total) * 100}%` : '0%' }}
          />
        </div>
        {remaining <= 2 && remaining > 0 && (
          <p className="text-xs text-red-500 mt-2">
            Recovery кодууд бараг дуусаж байна. Шинэ код үүсгэнэ үү.
          </p>
        )}
        {remaining === 0 && codes.length > 0 && (
          <p className="text-xs text-red-500 mt-2">
            Бүх recovery кодууд ашиглагдсан. Шинэ код үүсгэнэ үү!
          </p>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {showConfirm ? (
        <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
          <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">
            Шинэ кодууд үүсгэхэд хуучин бүх кодууд устгагдана. Үргэлжлүүлэх үү?
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowConfirm(false)}>
              Буцах
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleRegenerate}
              isLoading={isRegenerating}
            >
              Шинэ код үүсгэх
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" className="w-full" onClick={() => setShowConfirm(true)}>
          Шинэ кодууд үүсгэх
        </Button>
      )}

      <Button variant="ghost" className="w-full" onClick={onComplete}>
        Буцах
      </Button>
    </div>
  )
}
