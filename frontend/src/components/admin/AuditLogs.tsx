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
      <div className="text-center py-10 text-white/40">
        Лог бүртгэл байхгүй байна.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-center gap-4 p-3 rounded-lg bg-white/5 border-b border-white/5"
        >
          <span className="text-xs text-white/40 min-w-[140px]">
            {formatDateTime(log.created_at)}
          </span>
          <Badge variant="info">{log.action}</Badge>
          <span className="text-white/70 flex-1">{log.user_email}</span>
          <span className="text-xs text-white/40">{log.ip_address}</span>
        </div>
      ))}
    </div>
  )
}
