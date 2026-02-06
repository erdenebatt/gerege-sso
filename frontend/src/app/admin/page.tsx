'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Button, Input } from '@/components/ui'
import { useAdminStore } from '@/stores/adminStore'

export default function AdminLoginPage() {
  const router = useRouter()
  const { apiKey, setApiKey, fetchStats } = useAdminStore()
  const [inputKey, setInputKey] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Check if already logged in
    if (apiKey) {
      router.replace('/admin/dashboard')
    }
  }, [apiKey, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedKey = inputKey.trim()
    if (!trimmedKey) {
      setError('API түлхүүр оруулна уу.')
      return
    }

    setIsLoading(true)

    try {
      // Test the API key by fetching stats
      const res = await fetch('/api/admin/stats', {
        headers: { 'X-Admin-Key': trimmedKey },
      })

      if (res.ok) {
        setApiKey(trimmedKey)
        router.push('/admin/dashboard')
      } else {
        setError('API түлхүүр буруу байна.')
      }
    } catch {
      setError('Сүлжээний алдаа гарлаа.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-slate-50 dark:bg-slate-900">
      <div className="glass rounded-2xl p-12 w-full max-w-[400px] text-center">
        <div className="mb-5">
          <Image
            src="/assets/logo.png"
            alt="Gerege SSO"
            width={80}
            height={80}
            className="mx-auto rounded-xl"
          />
        </div>

        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Admin</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">API түлхүүрээр нэвтрэх</p>

        {error && (
          <div className="bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-5 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <Input
              type="password"
              label="API Key"
              placeholder="Таны API түлхүүр..."
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              autoComplete="off"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
          >
            Нэвтрэх
          </Button>
        </form>

        <Link
          href="/"
          className="inline-block mt-6 text-slate-400 dark:text-slate-500 text-sm hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          ← Нүүр хуудас
        </Link>
      </div>
    </div>
  )
}
