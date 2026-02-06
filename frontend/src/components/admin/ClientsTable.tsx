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
      <div className="text-center py-10 text-white/40">
        Клиент бүртгэлгүй байна.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase tracking-wider border-b border-white/10">
              Нэр
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase tracking-wider border-b border-white/10">
              Client ID
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase tracking-wider border-b border-white/10">
              Redirect URI
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase tracking-wider border-b border-white/10">
              Статус
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase tracking-wider border-b border-white/10">
              Үйлдэл
            </th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-b border-white/5">
              <td className="px-4 py-3">
                <span className="font-medium">{client.name}</span>
              </td>
              <td className="px-4 py-3">
                <code className="px-2 py-1 bg-gerege-primary/10 text-gerege-primary rounded text-xs font-mono">
                  {truncate(client.client_id, 20)}
                </code>
              </td>
              <td className="px-4 py-3 text-white/80 text-sm">
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
