'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { api } from '@/lib/api'
import { Button, Input } from '@/components/ui'
import type { TOTPSetupResponse } from '@/types'

interface TOTPSetupProps {
  onComplete: () => void
  onCancel: () => void
}

type Step = 'setup' | 'verify' | 'recovery'

export function TOTPSetup({ onComplete, onCancel }: TOTPSetupProps) {
  const [step, setStep] = useState<Step>('setup')
  const [setupData, setSetupData] = useState<TOTPSetupResponse | null>(null)
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [copiedCodes, setCopiedCodes] = useState(false)

  const handleSetup = async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await api.mfa.setupTOTP()
      setSetupData(data)
      setStep('setup')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'TOTP тохируулахад алдаа гарлаа')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('6 оронтой код оруулна уу')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const data = await api.mfa.verifyTOTPSetup(code)
      setRecoveryCodes(data.recovery_codes.codes)
      setStep('recovery')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Буруу код')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'))
    setCopiedCodes(true)
    setTimeout(() => setCopiedCodes(false), 2000)
  }

  const handleDownloadCodes = () => {
    const text = `Gerege SSO - Recovery Codes\n${'='.repeat(30)}\n\n${recoveryCodes.join('\n')}\n\nЭдгээр кодуудыг аюулгүй газар хадгална уу.\nКод бүр зөвхөн нэг удаа ашиглагдана.`
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'gerege-recovery-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Initial state - start setup
  if (!setupData && step === 'setup') {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-indigo-600 dark:text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
            Authenticator апп тохируулах
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Google Authenticator, Microsoft Authenticator, эсвэл бусад TOTP апп ашиглана уу.
          </p>
        </div>
        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onCancel}>
            Буцах
          </Button>
          <Button variant="primary" className="flex-1" onClick={handleSetup} isLoading={isLoading}>
            Эхлүүлэх
          </Button>
        </div>
      </div>
    )
  }

  // Step 1: Show QR code
  if (step === 'setup' && setupData) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">QR код уншуулах</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Authenticator апп дээрээ QR кодыг уншуулна уу:
          </p>
          <div className="inline-block p-4 bg-white rounded-xl">
            <QRCodeSVG value={setupData.qr_code_uri} size={200} />
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => setShowSecret(!showSecret)}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {showSecret ? 'Нуух' : 'Гараар оруулах'}
          </button>
          {showSecret && (
            <div className="mt-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Secret key:</p>
              <code className="text-sm font-mono text-slate-900 dark:text-white break-all">
                {setupData.secret}
              </code>
            </div>
          )}
        </div>

        <Button variant="primary" className="w-full" onClick={() => setStep('verify')}>
          Үргэлжлүүлэх
        </Button>
      </div>
    )
  }

  // Step 2: Verify code
  if (step === 'verify') {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Код баталгаажуулах</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Authenticator аппаас 6 оронтой код оруулна уу:
          </p>
        </div>

        <Input
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          maxLength={6}
          className="text-center text-2xl tracking-widest"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
        />

        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setStep('setup')}>
            Буцах
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleVerify}
            isLoading={isLoading}
            disabled={code.length !== 6}
          >
            Баталгаажуулах
          </Button>
        </div>
      </div>
    )
  }

  // Step 3: Show recovery codes
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
          TOTP амжилттай тохируулагдлаа!
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Recovery кодуудаа аюулгүй газар хадгална уу:
        </p>
      </div>

      <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4">
        <div className="grid grid-cols-2 gap-2">
          {recoveryCodes.map((c, i) => (
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
          Эдгээр кодуудыг зөвхөн нэг удаа харуулна. Authenticator апп-д хандах боломжгүй болсон
          тохиолдолд эдгээр кодуудыг ашиглана.
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
