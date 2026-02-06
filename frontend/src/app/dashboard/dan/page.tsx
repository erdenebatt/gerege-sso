'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout'
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen p-4 md:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
            ДАН баталгаажуулалт
          </h1>

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
                  Иргэний үнэмлэхийн регистрийн дугаараа оруулж баталгаажуулна уу.
                  Энэ нь таны бүртгэлийг ДАН системтэй холбоно.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Регистрийн дугаар"
                    placeholder="ДА12345678"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value.toUpperCase())}
                    error={error || undefined}
                    disabled={isLoading}
                  />

                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Регистрийн дугаар нь 2 үсэг + 8 тоо форматтай байна. Жишээ: АА12345678
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={isLoading}
                    disabled={regNo.length < 10}
                  >
                    Баталгаажуулах
                  </Button>
                </form>

                <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>Анхааруулга:</strong> Регистрийн дугаар нь ДАН системд бүртгэлтэй байх ёстой.
                      Хэрэв танд ДАН бүртгэл байхгүй бол эхлээд{' '}
                      <a href="https://dan.gov.mn" target="_blank" rel="noopener noreferrer" className="underline">
                        dan.gov.mn
                      </a>
                      {' '}хаягаар бүртгүүлнэ үү.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
