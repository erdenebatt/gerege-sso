'use client'

import { useState, useEffect } from 'react'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  Input,
  Button,
} from '@/components/ui'
import type { OAuthClient, CreateClientDTO } from '@/types'

interface ClientModalProps {
  isOpen: boolean
  onClose: () => void
  client?: OAuthClient | null
  onSubmit: (data: CreateClientDTO) => Promise<{ clientId?: string; clientSecret?: string } | null>
}

export function ClientModal({
  isOpen,
  onClose,
  client,
  onSubmit,
}: ClientModalProps) {
  const [name, setName] = useState('')
  const [redirectUri, setRedirectUri] = useState('')
  const [scopes, setScopes] = useState('openid, profile')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)

  const isEdit = !!client

  useEffect(() => {
    if (client) {
      setName(client.name)
      setRedirectUri(client.redirect_uri)
      setScopes(client.allowed_scopes?.join(', ') || 'openid, profile')
    } else {
      setName('')
      setRedirectUri('')
      setScopes('openid, profile')
    }
    setSecret(null)
  }, [client, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const scopesArray = scopes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const result = await onSubmit({
      name,
      redirect_uri: redirectUri,
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
        <ModalTitle>
          {isEdit ? 'Клиент засах' : 'Шинэ OAuth2 клиент'}
        </ModalTitle>
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

          <Input
            label="Redirect URI"
            type="url"
            placeholder="https://yourapp.com/callback"
            value={redirectUri}
            onChange={(e) => setRedirectUri(e.target.value)}
            required
            disabled={!!secret}
          />

          <Input
            label="Scopes (таслалаар тусгаарлах)"
            placeholder="openid, profile"
            value={scopes}
            onChange={(e) => setScopes(e.target.value)}
            disabled={!!secret}
          />

          {secret && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mt-4">
              <h4 className="text-orange-400 text-sm font-medium mb-2">
                Client Secret (нэг удаа харагдана!)
              </h4>
              <code className="block bg-black/30 p-3 rounded-lg text-sm font-mono break-all text-white">
                {secret}
              </code>
              <p className="text-xs text-orange-400/80 mt-2">
                Энэ түлхүүрийг хадгалаарай. Дахин харагдахгүй!
              </p>
            </div>
          )}
        </div>

        <ModalFooter>
          {secret ? (
            <Button
              type="button"
              variant="primary"
              className="w-full"
              onClick={handleClose}
            >
              Хаах
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={handleClose}
              >
                Болих
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                isLoading={isSubmitting}
              >
                {isEdit ? 'Хадгалах' : 'Үүсгэх'}
              </Button>
            </>
          )}
        </ModalFooter>
      </form>
    </Modal>
  )
}
