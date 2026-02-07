'use client'

import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { formatDateTime } from '@/lib/utils'
import type { User } from '@/types'

const PROVIDERS = [
  { key: 'google', name: 'Google' },
  { key: 'facebook', name: 'Facebook' },
  { key: 'twitter', name: 'Twitter / X' },
  { key: 'apple', name: 'Apple' },
]

interface SecurityCardProps {
  user: User
}

export function SecurityCard({ user }: SecurityCardProps) {
  const connectedProviders = PROVIDERS.filter((p) => user.providers?.[p.key])
  const connectedCount = connectedProviders.length
  const connectedNames = connectedProviders.map((p) => p.name).join(', ')

  return (
    <Card variant="strong" hover>
      <CardHeader>
        <CardTitle className="text-slate-900 dark:text-white">
          <svg
            className="w-5 h-5 text-purple-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          Дансны аюулгүй байдал
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Connected Providers */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-100 dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-indigo-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </div>
            <div>
              <div className="font-medium text-slate-900 dark:text-white">
                {connectedNames || 'Холбогдоогүй'}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{user.email}</div>
            </div>
          </div>
          <Badge variant="success">Идэвхтэй</Badge>
        </div>

        {/* Last Login */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-100 dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-slate-500 dark:text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <div className="font-medium text-slate-900 dark:text-white">Сүүлийн нэвтрэлт</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {formatDateTime(user.last_login_at || user.updated_at)}
              </div>
            </div>
          </div>
        </div>

        {/* Connected Provider Count */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-100 dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-slate-500 dark:text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <div className="font-medium text-slate-900 dark:text-white">Холбогдсон сервисүүд</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {connectedCount} холбогдсон сервис
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
