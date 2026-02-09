'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalFooter, Input, Button } from '@/components/ui'
import { copyToClipboard } from '@/lib/utils'
import type { OAuthClient, CreateClientDTO } from '@/types'

interface ClientModalProps {
  isOpen: boolean
  onClose: () => void
  client?: OAuthClient | null
  onSubmit: (data: CreateClientDTO) => Promise<{ clientId?: string; clientSecret?: string } | null>
}

export function ClientModal({ isOpen, onClose, client, onSubmit }: ClientModalProps) {
  const [name, setName] = useState('')
  const [redirectUris, setRedirectUris] = useState('')
  const [scopes, setScopes] = useState('openid, profile')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)
  const [secretCopied, setSecretCopied] = useState(false)

  const isEdit = !!client

  useEffect(() => {
    if (client) {
      setName(client.name)
      setRedirectUris(client.redirect_uris?.join('\n') || '')
      setScopes(client.allowed_scopes?.join(', ') || 'openid, profile')
    } else {
      setName('')
      setRedirectUris('')
      setScopes('openid, profile')
    }
    setSecret(null)
  }, [client, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const redirectUrisArray = redirectUris
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)

    const scopesArray = scopes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const result = await onSubmit({
      name,
      redirect_uris: redirectUrisArray,
      scopes: scopesArray,
    })

    setIsSubmitting(false)

    if (result?.clientSecret) {
      setSecret(result.clientSecret)
    } else if (!isEdit) {
      handleClose()
    } else {
      handleClose()
    }
  }

  const handleClose = () => {
    setSecret(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalHeader>
        <ModalTitle>{isEdit ? 'Клиент засах' : 'Шинэ OAuth2 клиент'}</ModalTitle>
      </ModalHeader>

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Input
            label="Аппликейшны нэр"
            placeholder="Жнь: Голомт банк"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={!!secret}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Redirect URIs (мөр бүрт нэг)
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
              rows={3}
              placeholder={'https://yourapp.com/callback\nhttps://staging.yourapp.com/callback'}
              value={redirectUris}
              onChange={(e) => setRedirectUris(e.target.value)}
              required
              disabled={!!secret}
            />
          </div>

          <Input
            label="Scopes (таслалаар тусгаарлах)"
            placeholder="openid, profile"
            value={scopes}
            onChange={(e) => setScopes(e.target.value)}
            disabled={!!secret}
          />

          {secret && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-4 mt-4">
              <h4 className="text-amber-600 dark:text-amber-400 text-sm font-medium mb-2">
                Client Secret (нэг удаа харагдана!)
              </h4>
              <div className="relative">
                <code className="block bg-slate-100 dark:bg-slate-800 p-3 pr-10 rounded-lg text-sm font-mono break-all text-slate-900 dark:text-white">
                  {secret}
                </code>
                <button
                  type="button"
                  onClick={async () => {
                    await copyToClipboard(secret)
                    setSecretCopied(true)
                    setTimeout(() => setSecretCopied(false), 2000)
                  }}
                  className="absolute top-2 right-2 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                  title="Хуулах"
                >
                  {secretCopied ? (
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
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-2">
                Энэ түлхүүрийг хадгалаарай. Дахин харагдахгүй!
              </p>
            </div>
          )}
        </div>

        <ModalFooter>
          {secret ? (
            <Button type="button" variant="primary" className="w-full" onClick={handleClose}>
              Хаах
            </Button>
          ) : (
            <>
              <Button type="button" variant="secondary" className="flex-1" onClick={handleClose}>
                Болих
              </Button>
              <Button type="submit" variant="primary" className="flex-1" isLoading={isSubmitting}>
                {isEdit ? 'Хадгалах' : 'Үүсгэх'}
              </Button>
            </>
          )}
        </ModalFooter>
      </form>
    </Modal>
  )
}
