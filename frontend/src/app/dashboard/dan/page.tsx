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

      <Card variant="strong">
        <CardContent className="space-y-6 text-center py-8">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${isVerified ? 'bg-green-100 dark:bg-green-500/20' : 'bg-slate-100 dark:bg-slate-700'
            }`}>
            {isVerified ? (
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <span className="text-3xl">🏛️</span>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              {isVerified ? 'Таны бүртгэл баталгаажсан байна' : 'Иргэний мэдээлэл баталгаажуулах'}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              {isVerified
                ? 'Та ДАН системээр дахин баталгаажуулалт хийж, мэдээллээ шинэчлэх боломжтой.'
                : 'Төрийн цахим үйлчилгээний нэгдсэн систем (ДАН) ашиглан нэвтэрч баталгаажуулалт хийнэ үү.'}
            </p>
          </div>

          <div className="max-w-xs mx-auto">
            <Button
              className="w-full h-12 text-base"
              onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/auth/dan`}
            >
              <span className="mr-2">🔐</span>
              {isVerified ? 'Дахин баталгаажуулах' : 'ДАН системээр баталгаажуулах'}
            </Button>
          </div>

          {isVerified && user?.dan_verified_at && (
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Сүүлд баталгаажуулсан: {new Date(user.dan_verified_at).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification History */}
      {user?.dan_history && user.dan_history.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
            Баталгаажуулалтын түүх (Сүүлийн 10)
          </h3>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 font-medium text-slate-500 dark:text-slate-400">Огноо</th>
                  <th className="px-6 py-3 font-medium text-slate-500 dark:text-slate-400">Төрөл</th>
                  <th className="px-6 py-3 font-medium text-slate-500 dark:text-slate-400">Төлөв</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {user.dan_history.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                    <td className="px-6 py-4 text-slate-900 dark:text-white">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      ДАН (SSO)
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400">
                        Амжилттай
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Таныг <strong>sso.gov.mn</strong> руу шилжүүлэх бөгөөд амжилттай нэвтэрсний дараа автоматаар бүртгэл шинэчлэгдэх болно.
          </div>
        </div>
      </div>
    </div>
  )
}
