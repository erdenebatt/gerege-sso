'use client'

import { useState } from 'react'
import { Badge, Button, SkeletonTable } from '@/components/ui'
import { truncate, copyToClipboard } from '@/lib/utils'
import type { OAuthClient } from '@/types'

interface ClientsTableProps {
  clients: OAuthClient[]
  isLoading?: boolean
  onEdit: (client: OAuthClient) => void
  onDelete: (clientId: string, clientName: string) => void
}

export function ClientsTable({ clients, isLoading, onEdit, onDelete }: ClientsTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = async (clientId: string) => {
    await copyToClipboard(clientId)
    setCopiedId(clientId)
    setTimeout(() => setCopiedId(null), 2000)
  }
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
              Redirect URIs
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
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded text-xs font-mono">
                    {truncate(client.client_id, 20)}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(client.client_id)}
                    className="text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                    title="Client ID хуулах"
                  >
                    {copiedId === client.client_id ? (
                      <svg
                        className="w-4 h-4 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
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
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-sm">
                {truncate(client.redirect_uris?.join(', ') || '', 40)}
              </td>
              <td className="px-4 py-3">
                <Badge variant={client.is_active ? 'success' : 'danger'}>
                  {client.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(client)}>
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
