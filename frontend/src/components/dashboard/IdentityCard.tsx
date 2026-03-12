'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui'
import { maskText, copyToClipboard, formatGender } from '@/lib/utils'
import type { User } from '@/types'

interface IdentityCardProps {
  user: User
  onCopy?: (text: string) => void
}

export function IdentityCard({ user, onCopy }: IdentityCardProps) {
  const [isMasked, setIsMasked] = useState(true)

  const handleCopy = async (text: string) => {
    await copyToClipboard(text)
    onCopy?.(text)
  }

  const displayValue = (value: string | undefined) => {
    if (!value || value === '—') return '—'
    return isMasked ? maskText(value) : value
  }

  return (
    <Card variant="strong" hover>
      <CardHeader>
        <CardTitle className="text-slate-900 dark:text-white">
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
              d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0"
            />
          </svg>
          Иргэний мэдээлэл
        </CardTitle>
        {user.verified && (
          <Badge variant="success">✓ Баталгаажсан</Badge>
        )}
      </CardHeader>

      <CardContent>
        {/* Gen ID */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Gerege ID</div>
            <div className="font-mono text-lg gradient-text">{user.gen_id || '—'}</div>
          </div>
          <button
            onClick={() => handleCopy(user.gen_id)}
            className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            <svg
              className="w-4 h-4 text-slate-500 dark:text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>

        {/* Name */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ургийн овог</div>
            <div className="font-medium text-slate-900 dark:text-white truncate">
              {displayValue(user.gerege?.family_name?.toUpperCase())}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Овог</div>
            <div className="font-medium text-slate-900 dark:text-white truncate">
              {displayValue(user.gerege?.last_name?.toUpperCase())}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Нэр</div>
            <div className="font-medium text-slate-900 dark:text-white truncate">
              {user.gerege?.first_name?.toUpperCase() || '—'}
            </div>
          </div>
        </div>

        {/* Reg No & Birth */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Регистрийн дугаар</div>
            <div className="font-mono text-slate-900 dark:text-white">
              {displayValue(user.gerege?.reg_no)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Төрсөн огноо</div>
            <div className="font-medium text-slate-900 dark:text-white">
              {displayValue(user.gerege?.birth_date)}
            </div>
          </div>
        </div>

        {/* Show/Hide Button */}
        <Button
          variant="secondary"
          className="w-full bg-gradient-to-r from-indigo-100 dark:from-indigo-500/20 to-purple-100 dark:to-purple-500/20 hover:from-indigo-200 dark:hover:from-indigo-500/30 hover:to-purple-200 dark:hover:to-purple-500/30 border-0"
          onClick={() => setIsMasked(!isMasked)}
        >
          {isMasked ? (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              Мэдээлэл харах
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
              Мэдээлэл нуух
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
