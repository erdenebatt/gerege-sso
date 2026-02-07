'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'

type APILog = {
  id: number
  method: string
  path: string
  query: string
  status_code: number
  latency_ms: number
  client_ip: string
  user_agent: string
  request_headers: string
  request_body: string
  response_headers: string
  response_body: string
  created_at: string
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    POST: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
    PUT: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold ${colors[method] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}
    >
      {method}
    </span>
  )
}

function StatusBadge({ code }: { code: number }) {
  const color =
    code < 300
      ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
      : code < 500
        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
        : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold ${color}`}
    >
      {code}
    </span>
  )
}

function formatJSON(str: string) {
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return str || '(empty)'
  }
}

function LogRow({ log }: { log: APILog }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <MethodBadge method={log.method} />
        <span className="flex-1 font-mono text-sm text-slate-700 dark:text-slate-300 truncate">
          {log.path}
          {log.query ? '?' + log.query : ''}
        </span>
        <StatusBadge code={log.status_code} />
        <span className="text-xs text-slate-500 dark:text-slate-400 w-16 text-right">
          {log.latency_ms}ms
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500 w-40 text-right hidden sm:block">
          {new Date(log.created_at).toLocaleString()}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-4 bg-slate-50 dark:bg-slate-800/30">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-slate-500 dark:text-slate-400">IP:</span>{' '}
              <span className="text-slate-900 dark:text-white">{log.client_ip}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Latency:</span>{' '}
              <span className="text-slate-900 dark:text-white">{log.latency_ms}ms</span>
            </div>
            <div className="truncate">
              <span className="text-slate-500 dark:text-slate-400">UA:</span>{' '}
              <span className="text-slate-900 dark:text-white">{log.user_agent}</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Request Headers
              </h4>
              <pre className="text-xs bg-slate-900 text-green-400 p-3 rounded-lg overflow-auto max-h-48">
                {formatJSON(log.request_headers)}
              </pre>
              {log.request_body && (
                <>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-3 mb-2">
                    Request Body
                  </h4>
                  <pre className="text-xs bg-slate-900 text-green-400 p-3 rounded-lg overflow-auto max-h-48">
                    {formatJSON(log.request_body)}
                  </pre>
                </>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Response Headers
              </h4>
              <pre className="text-xs bg-slate-900 text-blue-400 p-3 rounded-lg overflow-auto max-h-48">
                {formatJSON(log.response_headers)}
              </pre>
              {log.response_body && (
                <>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-3 mb-2">
                    Response Body
                  </h4>
                  <pre className="text-xs bg-slate-900 text-blue-400 p-3 rounded-lg overflow-auto max-h-48">
                    {formatJSON(log.response_body)}
                  </pre>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function APILogsPage() {
  const { user } = useAuthStore()
  const [logs, setLogs] = useState<APILog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(() => {
    setLoading(true)
    api.auth
      .apiLogs()
      .then((data) => {
        setLogs(data.logs || [])
        setError(null)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!user) return
    fetchLogs()
  }, [user, fetchLogs])

  if (!user) return null

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">API Лог</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Сүүлийн 50 API хүсэлт/хариултын бүртгэл
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Шинэчлэх
        </button>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Ачааллаж байна...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">Лог олдсонгүй</div>
      )}

      {!loading && logs.length > 0 && (
        <div className="space-y-2">
          {logs.map((log) => (
            <LogRow key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  )
}
