'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent, Button, Modal } from '@/components/ui'
import { TOTPSetup, PasskeySetup, DeviceManagement, RecoveryCodes } from '@/components/mfa'
import type { MFASettings } from '@/types'

type ModalView = 'totp_setup' | 'passkey_setup' | 'device_management' | 'recovery_codes' | null

export default function MFASettingsPage() {
  const { user, fetchUser } = useAuthStore()
  const [settings, setSettings] = useState<MFASettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [modalView, setModalView] = useState<ModalView>(null)
  const [disabling, setDisabling] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchSettings = useCallback(async () => {
    try {
      const data = await api.mfa.getSettings()
      setSettings(data)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleDisableTOTP = async () => {
    setDisabling('totp')
    setError('')
    try {
      await api.mfa.disableTOTP()
      setSuccess('TOTP унтраагдлаа')
      fetchSettings()
      fetchUser()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа')
    } finally {
      setDisabling(null)
    }
  }

  const handleUpdatePreferred = async (method: string) => {
    try {
      await api.mfa.updateSettings({ preferred_method: method })
      fetchSettings()
    } catch {
      // ignore
    }
  }

  const handleModalComplete = () => {
    setModalView(null)
    fetchSettings()
    fetchUser()
  }

  if (!user) return null

  const methods = [
    {
      key: 'totp',
      name: 'Authenticator апп',
      description: 'Google Authenticator, Microsoft Authenticator зэрэг TOTP апп',
      enabled: settings?.totp_enabled ?? false,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-100 dark:bg-indigo-500/20',
      onEnable: () => setModalView('totp_setup'),
      onDisable: handleDisableTOTP,
    },
    {
      key: 'passkey',
      name: 'Passkey / Security Key',
      description: 'Fingerprint, Face ID, эсвэл FIDO2 Security Key',
      enabled: settings?.passkey_enabled ?? false,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
      ),
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-500/20',
      onEnable: () => setModalView('passkey_setup'),
      onDisable: undefined,
    },
    {
      key: 'push',
      name: 'Push мэдэгдэл',
      description: 'Gerege Authenticator апп-руу push мэдэгдэл илгээх',
      enabled: settings?.push_enabled ?? false,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      ),
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-500/20',
      onEnable: () => setModalView('device_management'),
      onDisable: undefined,
    },
  ]

  const anyEnabled = settings?.totp_enabled || settings?.passkey_enabled || settings?.push_enabled

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
          Хоёр шатлалт баталгаажуулалт (MFA)
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Нэвтрэлтийн аюулгүй байдлыг нэмэгдүүлэх баталгаажуулалтын аргууд
        </p>
      </div>

      {/* MFA Status */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  anyEnabled
                    ? 'bg-emerald-100 dark:bg-emerald-500/20'
                    : 'bg-slate-100 dark:bg-slate-800'
                }`}
              >
                <svg
                  className={`w-5 h-5 ${anyEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <div className="font-medium text-slate-900 dark:text-white">
                  MFA статус: {anyEnabled ? 'Идэвхтэй' : 'Идэвхгүй'}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {anyEnabled
                    ? 'Таны бүртгэл хоёр шатлалт баталгаажуулалтаар хамгаалагдсан'
                    : 'MFA идэвхжүүлж бүртгэлээ хамгаалаарай'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MFA Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">
            <svg
              className="w-5 h-5 text-indigo-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Баталгаажуулалтын аргууд
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-6">
              <div className="w-6 h-6 border-2 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Ачааллаж байна...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {methods.map((method) => (
                <div
                  key={method.key}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full ${method.bgColor} flex items-center justify-center ${method.color}`}
                    >
                      {method.icon}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        {method.name}
                        {method.enabled && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                            Идэвхтэй
                          </span>
                        )}
                        {settings?.preferred_method === method.key && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400">
                            Үндсэн
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {method.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {method.enabled && settings?.preferred_method !== method.key && (
                      <button
                        onClick={() => handleUpdatePreferred(method.key)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Үндсэн болгох
                      </button>
                    )}
                    {method.enabled ? (
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={method.onEnable} className="text-xs">
                          Тохиргоо
                        </Button>
                        {method.onDisable && (
                          <Button
                            variant="danger"
                            onClick={method.onDisable}
                            isLoading={disabling === method.key}
                            className="text-xs"
                          >
                            Унтраах
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button variant="primary" onClick={method.onEnable} className="text-xs">
                        Тохируулах
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 p-3 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/50 rounded-lg text-emerald-600 dark:text-emerald-400 text-sm">
              {success}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recovery Codes */}
      {anyEnabled && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="text-slate-900 dark:text-white">
                <svg
                  className="w-5 h-5 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Recovery кодууд
              </CardTitle>
              <Button
                variant="secondary"
                onClick={() => setModalView('recovery_codes')}
                className="text-xs"
              >
                Удирдах
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Authenticator апп-д хандах боломжгүй тохиолдолд нөөц кодууд ашиглан нэвтрэх боломжтой.
              Recovery кодуудаа аюулгүй газар хадгалсан эсэхээ шалгаарай.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Devices */}
      {settings?.push_enabled && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="text-slate-900 dark:text-white">
                <svg
                  className="w-5 h-5 text-purple-500"
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
                Төхөөрөмжүүд
              </CardTitle>
              <Button
                variant="secondary"
                onClick={() => setModalView('device_management')}
                className="text-xs"
              >
                Удирдах
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Push мэдэгдэл хүлээн авах бүртгэлтэй төхөөрөмжүүдийг удирдах.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <Modal isOpen={modalView !== null} onClose={() => setModalView(null)} size="md">
        {modalView === 'totp_setup' && (
          <TOTPSetup onComplete={handleModalComplete} onCancel={() => setModalView(null)} />
        )}
        {modalView === 'passkey_setup' && <PasskeySetup onComplete={handleModalComplete} />}
        {modalView === 'device_management' && <DeviceManagement onComplete={handleModalComplete} />}
        {modalView === 'recovery_codes' && <RecoveryCodes onComplete={handleModalComplete} />}
      </Modal>
    </div>
  )
}
