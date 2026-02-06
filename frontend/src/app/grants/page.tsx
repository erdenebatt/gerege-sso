'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useAuthStore } from '@/stores/authStore'
import { Badge, Button, Skeleton, useToast } from '@/components/ui'
import { formatDate } from '@/lib/utils'

export default function GrantsPage() {
  const router = useRouter()
  const { token, grants, fetchGrants, revokeGrant } = useAuthStore()
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      router.replace('/?redirect=/grants')
      return
    }

    fetchGrants().finally(() => setIsLoading(false))
  }, [token, fetchGrants, router])

  const handleRevoke = async (grantId: string, clientName: string) => {
    if (!confirm(`${clientName} аппликейшны хандах эрхийг цуцлах уу?`)) {
      return
    }

    setRevokingId(grantId)
    const success = await revokeGrant(grantId)
    setRevokingId(null)

    if (success) {
      showToast('Эрх амжилттай цуцлагдлаа', 'success')
    } else {
      showToast('Алдаа гарлаа', 'error')
    }
  }

  return (
    <div className="max-w-[680px] mx-auto px-5 py-10 min-h-screen bg-slate-50 dark:bg-slate-900">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-6 hover:text-indigo-500 transition-colors"
      >
        ← Нүүр хуудас
      </Link>

      <div className="text-center mb-8">
        <Image
          src="/assets/logo.png"
          alt="Gerege SSO"
          width={80}
          height={80}
          className="mx-auto mb-4 rounded-xl"
        />
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
          Холбогдсон аппликейшнүүд
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Эдгээр аппликейшнүүд таны Gerege дансанд хандах эрхтэй.
        </p>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : grants.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔒</div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Одоогоор ямар ч аппликейшн таны дансанд холбогдоогүй байна.
            </p>
          </div>
        ) : (
          grants.map((grant) => (
            <div
              key={grant.id}
              className="glass rounded-2xl p-5 flex items-center justify-between gap-4 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all"
            >
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                  {grant.client_name}
                </h3>
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                  <span className="mr-4">
                    Холбогдсон: {formatDate(grant.granted_at)}
                  </span>
                  {grant.last_used_at && (
                    <span>
                      Сүүлд ашигласан: {formatDate(grant.last_used_at)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {grant.scopes?.map((scope) => (
                    <Badge key={scope} variant="success">
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleRevoke(grant.id, grant.client_name)}
                isLoading={revokingId === grant.id}
                disabled={!!revokingId}
              >
                Цуцлах
              </Button>
            </div>
          ))
        )}
      </div>

      <footer className="mt-12 text-center text-slate-400 dark:text-slate-500 text-xs">
        &copy; 2025 Gerege SSO
      </footer>
    </div>
  )
}
