'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'

export default function DanVerificationPage() {
  const router = useRouter()
  const { user, fetchUser } = useAuthStore()
  const [regNo, setRegNo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await api.auth.verify(regNo)
      setSuccess(true)
      await fetchUser()
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Баталгаажуулалт амжилтгүй боллоо')
    } finally {
      setIsLoading(false)
    }
  }

  const isVerified = user?.verified

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          ДАН баталгаажуулалт
        </h1>
      </div>

      {isVerified ? (
        <Card variant="strong">
          <CardContent className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Баталгаажсан
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Таны иргэний мэдээлэл амжилттай баталгаажсан байна.
            </p>
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800">
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Регистрийн дугаар</div>
              <div className="font-mono text-lg text-slate-900 dark:text-white">
                {user?.gerege?.reg_no || '—'}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : success ? (
        <Card variant="strong">
          <CardContent className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Амжилттай!
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Таны иргэний мэдээлэл амжилттай баталгаажлаа. Хянах самбар руу шилжиж байна...
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card variant="strong">
          <CardHeader>
            <CardTitle>Иргэний үнэмлэхээр баталгаажуулах</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Төрийн цахим үйлчилгээний нэгдсэн систем (ДАН) ашиглан нэвтэрч баталгаажуулалт хийнэ үү.
            </p>

            <Button
              className="w-full h-12 text-base"
              onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/auth/dan`}
            >
              <span className="mr-2">🔐</span>
              ДАН системээр баталгаажуулах
            </Button>

            <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Таныг <strong>sso.gov.mn</strong> руу шилжүүлэх бөгөөд амжилттай нэвтэрсний дараа автоматаар буцаж ирэх болно.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
