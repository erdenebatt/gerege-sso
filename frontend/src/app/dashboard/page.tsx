'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { Sidebar } from '@/components/layout'
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
import { useSettingsStore } from '@/stores/settingsStore'

export default function DashboardPage() {
  const router = useRouter()
  const { token, user, grants, isLoading, fetchUser, fetchGrants, revokeGrant, logout } =
    useAuthStore()
  const { showToast } = useToast()
  const { theme, toggleTheme } = useSettingsStore()

  const [faceModalOpen, setFaceModalOpen] = useState(false)
  const [revokeModalOpen, setRevokeModalOpen] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<{
    id: string
    name: string
  } | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Sidebar />
        <div className="lg:pl-64">
          <div className="sticky top-0 z-40 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700" />
          <main className="p-6">
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
      </div>
    )
  }

  if (!user) {
    return null
  }

  const verificationLevel = getVerificationLevel(user)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-40 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 flex items-center justify-between">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Page Title */}
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white hidden sm:block">
            Хянах самбар
          </h1>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Notifications */}
            <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors relative">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            {/* User menu */}
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-700 ml-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                {user?.gerege?.name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Сайн байна уу,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
                {user.gerege?.name || user.email?.split('@')[0] || 'Хэрэглэгч'}
              </span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400">Таны Gerege дижитал иргэний данс</p>
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
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-indigo-500"
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
              </h3>
              <span className="text-sm text-slate-400 dark:text-slate-500">{grants.length} апп</span>
            </div>

            {grants.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-slate-400 dark:text-slate-500"
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
                <p className="text-slate-500 dark:text-slate-400">
                  Одоогоор ямар ч апп холбогдоогүй байна
                </p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
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
      </div>

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
