'use client'

import { Card, CardContent } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'

export default function DanVerificationPage() {
  const { user } = useAuthStore()

  const isVerified = user?.verified

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">ДАН баталгаажуулалт</h1>
      </div>

      <Card variant="strong">
        <CardContent className="space-y-6 text-center py-8">
          <div
            className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
              isVerified
                ? 'bg-green-100 dark:bg-green-500/20'
                : 'bg-indigo-100 dark:bg-indigo-500/20'
            }`}
          >
            {isVerified ? (
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-8 h-8 text-indigo-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                />
              </svg>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              {isVerified ? 'Таны бүртгэл баталгаажсан байна' : 'Иргэний мэдээлэл баталгаажуулах'}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              {isVerified
                ? 'ДАН-аар дахин баталгаажуулалт хийж, мэдээллээ шинэчлэх боломжтой.'
                : 'ДАН системээр нэвтэрч иргэний мэдээллээ баталгаажуулна уу.'}
            </p>
          </div>

          {/* DAN SSO Button */}
          <div className="max-w-sm mx-auto">
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/dan`}
              className="flex items-center justify-center gap-3 w-full h-12 text-base font-medium rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              {isVerified ? 'Дахин баталгаажуулах' : 'ДАН-аар нэвтрэх'}
            </a>
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
            Баталгаажуулалтын түүх
          </h3>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 font-medium text-slate-500 dark:text-slate-400">
                    Огноо
                  </th>
                  <th className="px-6 py-3 font-medium text-slate-500 dark:text-slate-400">
                    Төрөл
                  </th>
                  <th className="px-6 py-3 font-medium text-slate-500 dark:text-slate-400">
                    Төлөв
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {user.dan_history.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                    <td className="px-6 py-4 text-slate-900 dark:text-white">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {log.method === 'dan_sso' ? 'ДАН (SSO)' : 'Регистрийн дугаар'}
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
    </div>
  )
}
