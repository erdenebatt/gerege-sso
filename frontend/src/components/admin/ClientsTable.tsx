'use client'

import { Badge, Button, SkeletonTable } from '@/components/ui'
import { truncate } from '@/lib/utils'
import type { OAuthClient } from '@/types'

interface ClientsTableProps {
  clients: OAuthClient[]
  isLoading?: boolean
  onEdit: (client: OAuthClient) => void
  onDelete: (clientId: string, clientName: string) => void
}

export function ClientsTable({
  clients,
  isLoading,
  onEdit,
  onDelete,
}: ClientsTableProps) {
  if (isLoading) {
    return <SkeletonTable rows={3} />
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 dark:text-slate-500">
        Клиент бүртгэлгүй байна.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              Нэр
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              Client ID
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              Redirect URI
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              Статус
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              Үйлдэл
            </th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-b border-slate-100 dark:border-slate-800">
              <td className="px-4 py-3">
                <span className="font-medium text-slate-900 dark:text-white">{client.name}</span>
              </td>
              <td className="px-4 py-3">
                <code className="px-2 py-1 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded text-xs font-mono">
                  {truncate(client.client_id, 20)}
                </code>
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-sm">
                {truncate(client.redirect_uri, 40)}
              </td>
              <td className="px-4 py-3">
                <Badge variant={client.is_active ? 'success' : 'danger'}>
                  {client.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(client)}
                  >
                    Засах
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDelete(client.id, client.name)}
                  >
                    Устгах
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
