'use client'

import { Card, Badge, Button } from '@/components/ui'
import { formatDate, getInitials } from '@/lib/utils'
import type { Grant } from '@/types'

interface GrantCardProps {
  grant: Grant
  onRevoke: (grantId: string, clientName: string) => void
}

export function GrantCard({ grant, onRevoke }: GrantCardProps) {
  return (
    <Card hover className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 dark:from-indigo-500/20 to-purple-100 dark:to-purple-500/20 flex items-center justify-center">
          <span className="text-xl font-bold gradient-text">
            {getInitials(grant.client_name)}
          </span>
        </div>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {formatDate(grant.granted_at)}
        </span>
      </div>

      <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{grant.client_name || 'Unknown App'}</h3>

      <div className="flex flex-wrap gap-1 mb-4">
        {grant.scopes?.map((scope) => (
          <Badge key={scope} variant="default">
            {scope}
          </Badge>
        ))}
      </div>

      {grant.last_used_at && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
          Сүүлд: {formatDate(grant.last_used_at)}
        </p>
      )}

      <Button
        variant="danger"
        className="w-full"
        onClick={() => onRevoke(grant.id, grant.client_name)}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
        Эрх цуцлах
      </Button>
    </Card>
  )
}
