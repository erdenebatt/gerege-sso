'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui'
import { formatDateTime } from '@/lib/utils'
import type { DeviceInfo } from '@/types'

interface DeviceManagementProps {
  onComplete: () => void
}

export function DeviceManagement({ onComplete }: DeviceManagementProps) {
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchDevices = useCallback(async () => {
    try {
      const data = await api.mfa.listDevices()
      setDevices(data.devices || [])
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDevices()
  }, [fetchDevices])

  const handleRemove = async (id: string) => {
    setRemovingId(id)
    setError('')
    try {
      await api.mfa.removeDevice(id)
      setDevices((prev) => prev.filter((d) => d.id !== id))
      setSuccess('Төхөөрөмж устгагдлаа')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Устгахад алдаа гарлаа')
    } finally {
      setRemovingId(null)
    }
  }

  const deviceIcon = (type: string) => {
    if (type === 'ios') {
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
      )
    }
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white">Бүртгэлтэй төхөөрөмжүүд</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Push мэдэгдэл хүлээн авах төхөөрөмжүүд
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/50 rounded-lg text-emerald-600 dark:text-emerald-400 text-sm">
          {success}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-6">
          <div className="w-6 h-6 border-2 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Ачааллаж байна...</p>
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Бүртгэлтэй төхөөрөмж байхгүй</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Gerege Authenticator апп-аар төхөөрөмж бүртгэнэ үү
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {devices.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  {deviceIcon(device.device_type)}
                </div>
                <div>
                  <div className="font-medium text-sm text-slate-900 dark:text-white">
                    {device.device_name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {device.device_type === 'ios' ? 'iOS' : 'Android'}
                    {device.last_used_at && ` | Сүүлд: ${formatDateTime(device.last_used_at)}`}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleRemove(device.id)}
                disabled={removingId === device.id}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
              >
                {removingId === device.id ? (
                  <div className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      <Button variant="ghost" className="w-full" onClick={onComplete}>
        Буцах
      </Button>
    </div>
  )
}
