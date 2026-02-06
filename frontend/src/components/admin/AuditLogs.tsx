'use client'

import { Badge, Skeleton } from '@/components/ui'
import { formatDateTime } from '@/lib/utils'
import type { AuditLog } from '@/types'

interface AuditLogsProps {
  logs: AuditLog[]
  isLoading?: boolean
}

export function AuditLogs({ logs, isLoading }: AuditLogsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 dark:text-slate-500">
        Лог бүртгэл байхгүй байна.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-center gap-4 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700"
        >
          <span className="text-xs text-slate-400 dark:text-slate-500 min-w-[140px]">
            {formatDateTime(log.created_at)}
          </span>
          <Badge variant="info">{log.action}</Badge>
          <span className="text-slate-700 dark:text-slate-300 flex-1">{log.user_email}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">{log.ip_address}</span>
        </div>
      ))}
    </div>
  )
}
