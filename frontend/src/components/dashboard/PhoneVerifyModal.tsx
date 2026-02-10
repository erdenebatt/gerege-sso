'use client'

import { useState } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalDescription, Button } from '@/components/ui'
import { api, ApiError } from '@/lib/api'

interface PhoneVerifyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function PhoneVerifyModal({ isOpen, onClose, onSuccess }: PhoneVerifyModalProps) {
  const [step, setStep] = useState<'send' | 'verify'>('send')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [devOtp, setDevOtp] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null)

  const handleSendOTP = async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await api.auth.sendPhoneOTP()
      setPhone(data.phone)
      if (data.otp) {
        setDevOtp(data.otp)
      }
      setStep('verify')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Алдаа гарлаа')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError('6 оронтой код оруулна уу')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      await api.auth.verifyPhoneOTP(otp)
      onSuccess?.()
      handleClose()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        // Try to extract attempts_left from the error response
        try {
          const parsed = JSON.parse(JSON.stringify(err))
          if (parsed.attempts_left !== undefined) {
            setAttemptsLeft(parsed.attempts_left)
          }
        } catch {
          // ignore parse errors
        }
      } else {
        setError('Алдаа гарлаа')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setStep('send')
    setPhone('')
    setOtp('')
    setDevOtp(null)
    setError('')
    setIsLoading(false)
    setAttemptsLeft(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="sm" className="p-8">
      <ModalHeader>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-500/20 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-indigo-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
        </div>
        <ModalTitle>Утасны баталгаажуулалт</ModalTitle>
        <ModalDescription>
          {step === 'send'
            ? 'Иргэний бүртгэлд бүртгэлтэй утасны дугаар руу баталгаажуулах код илгээнэ'
            : `${phone} дугаар руу илгээсэн 6 оронтой кодыг оруулна уу`}
        </ModalDescription>
      </ModalHeader>

      {step === 'verify' && (
        <div className="mt-6 space-y-4">
          <div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '')
                setOtp(val)
                setError('')
              }}
              placeholder="000000"
              className="w-full text-center text-2xl tracking-[0.5em] font-mono py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>

          {devOtp && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Dev mode OTP: <span className="font-mono font-bold">{devOtp}</span>
              </p>
            </div>
          )}

          {attemptsLeft !== null && attemptsLeft > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              {attemptsLeft} оролдлого үлдсэн
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <Button variant="secondary" className="flex-1" onClick={handleClose}>
          Болих
        </Button>
        {step === 'send' ? (
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleSendOTP}
            isLoading={isLoading}
          >
            OTP илгээх
          </Button>
        ) : (
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleVerifyOTP}
            isLoading={isLoading}
            disabled={otp.length !== 6}
          >
            Баталгаажуулах
          </Button>
        )}
      </div>
    </Modal>
  )
}
