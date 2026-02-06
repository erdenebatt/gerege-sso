'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { Navbar } from '@/components/layout'
import { Card, Button, Skeleton, useToast } from '@/components/ui'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui'
import {
  VerificationProgress,
  IdentityCard,
  SecurityCard,
  GrantCard,
  FaceVerifyModal,
} from '@/components/dashboard'
import { getVerificationLevel } from '@/lib/utils'

export default function DashboardPage() {
  const router = useRouter()
  const { token, user, grants, isLoading, fetchUser, fetchGrants, revokeGrant, logout } =
    useAuthStore()
  const { showToast } = useToast()

  const [faceModalOpen, setFaceModalOpen] = useState(false)
  const [revokeModalOpen, setRevokeModalOpen] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<{
    id: string
    name: string
  } | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)

  useEffect(() => {
    if (!token) {
      router.replace('/?redirect=/dashboard')
      return
    }

    fetchUser()
    fetchGrants()
  }, [token, fetchUser, fetchGrants, router])

  const handleVerifyPhone = () => {
    showToast('Утасны баталгаажуулалт удахгүй...', 'info')
  }

  const handleVerifyDan = () => {
    router.push('/?action=verify')
  }

  const handleOpenRevoke = (grantId: string, clientName: string) => {
    setRevokeTarget({ id: grantId, name: clientName })
    setRevokeModalOpen(true)
  }

  const handleConfirmRevoke = async () => {
    if (!revokeTarget) return

    setIsRevoking(true)
    const success = await revokeGrant(revokeTarget.id)
    setIsRevoking(false)

    if (success) {
      showToast('Эрх амжилттай цуцлагдлаа', 'success')
    } else {
      showToast('Алдаа гарлаа', 'error')
    }

    setRevokeModalOpen(false)
    setRevokeTarget(null)
  }

  const handleCopy = () => {
    showToast('Хуулагдлаа', 'success')
  }

  const handleFaceSuccess = () => {
    showToast('Царай таних амжилттай', 'success')
  }

  if (!token || (isLoading && !user)) {
    return (
      <div className="min-h-screen">
        <div className="glass sticky top-0 z-50 h-16" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-40" />
            <div className="grid lg:grid-cols-2 gap-6">
              <Skeleton className="h-80" />
              <Skeleton className="h-80" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const verificationLevel = getVerificationLevel(user)

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Сайн байна уу,{' '}
            <span className="gradient-text">
              {user.gerege?.name || user.email?.split('@')[0] || 'Хэрэглэгч'}
            </span>
          </h1>
          <p className="text-white/50">Таны Gerege дижитал иргэний данс</p>
        </div>

        {/* Verification Progress */}
        <div className="mb-8">
          <VerificationProgress
            level={verificationLevel}
            onVerifyPhone={handleVerifyPhone}
            onVerifyDan={handleVerifyDan}
            onVerifyFace={() => setFaceModalOpen(true)}
          />
        </div>

        {/* Identity & Security Cards */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <IdentityCard user={user} onCopy={handleCopy} />
          <SecurityCard user={user} />
        </div>

        {/* Connected Apps (Grants) */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <svg
                className="w-5 h-5 text-gerege-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              Холбогдсон аппликейшнүүд
            </h2>
            <span className="text-sm text-white/40">{grants.length} апп</span>
          </div>

          {grants.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white/30"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <p className="text-white/50">
                Одоогоор ямар ч апп холбогдоогүй байна
              </p>
              <p className="text-sm text-white/30 mt-2">
                Гуравдагч аппликейшнүүд таны зөвшөөрлөөр холбогдох болно
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {grants.map((grant) => (
                <GrantCard
                  key={grant.id}
                  grant={grant}
                  onRevoke={handleOpenRevoke}
                />
              ))}
            </div>
          )}
        </Card>
      </main>

      {/* Face Verify Modal */}
      <FaceVerifyModal
        isOpen={faceModalOpen}
        onClose={() => setFaceModalOpen(false)}
        onSuccess={handleFaceSuccess}
      />

      {/* Revoke Confirmation Modal */}
      <Modal
        isOpen={revokeModalOpen}
        onClose={() => setRevokeModalOpen(false)}
        size="sm"
      >
        <ModalHeader>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <ModalTitle>Эрх цуцлах уу?</ModalTitle>
          <ModalDescription>
            &quot;{revokeTarget?.name}&quot; апп таны мэдээлэлд хандах эрхгүй
            болно.
          </ModalDescription>
        </ModalHeader>

        <ModalFooter>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setRevokeModalOpen(false)}
          >
            Болих
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={handleConfirmRevoke}
            isLoading={isRevoking}
          >
            Эрх цуцлах
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
