'use client'

import { SkeletonStats } from '@/components/ui'
import type { AdminStats } from '@/types'

interface StatsGridProps {
  stats: AdminStats | null
  isLoading?: boolean
}

export function StatsGrid({ stats, isLoading }: StatsGridProps) {
  if (isLoading || !stats) {
    return <SkeletonStats />
  }

  const items = [
    {
      label: 'Нийт клиентүүд',
      value: stats.clients.total,
      sub: `${stats.clients.active} идэвхтэй`,
    },
    {
      label: 'Нийт хэрэглэгчид',
      value: stats.users.total,
      sub: `${stats.users.verified} баталгаажсан`,
    },
    {
      label: 'Нэвтрэлт (24 цаг)',
      value: stats.logins_24h,
      sub: 'Сүүлийн 24 цагт',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="glass rounded-2xl p-6"
        >
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">{item.label}</div>
          <div className="text-4xl font-bold gradient-text">{item.value}</div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{item.sub}</div>
        </div>
      ))}
    </div>
  )
}
