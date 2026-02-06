'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAdminStore } from '@/stores/adminStore'
import { Button, useToast } from '@/components/ui'
import { StatsGrid, ClientsTable, AuditLogs, ClientModal } from '@/components/admin'
import type { OAuthClient, CreateClientDTO } from '@/types'
import { cn } from '@/lib/utils'

type TabType = 'clients' | 'logs'

export default function AdminDashboardPage() {
  const router = useRouter()
  const {
    apiKey,
    stats,
    clients,
    auditLogs,
    isLoading,
    logout,
    fetchStats,
    fetchClients,
    fetchAuditLogs,
    createClient,
    updateClient,
    deleteClient,
  } = useAdminStore()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState<TabType>('clients')
  const [modalOpen, setModalOpen] = useState(false)
  const [editClient, setEditClient] = useState<OAuthClient | null>(null)

  useEffect(() => {
    if (!apiKey) {
      router.replace('/admin')
      return
    }

    fetchStats()
    fetchClients()
  }, [apiKey, fetchStats, fetchClients, router])

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    if (tab === 'logs') {
      fetchAuditLogs()
    }
  }

  const handleLogout = () => {
    logout()
    router.replace('/admin')
  }

  const handleOpenCreate = () => {
    setEditClient(null)
    setModalOpen(true)
  }

  const handleEdit = (client: OAuthClient) => {
    setEditClient(client)
    setModalOpen(true)
  }

  const handleDelete = async (clientId: string, clientName: string) => {
    if (
      !confirm(
        `"${clientName}" клиентийг устгах уу? Энэ үйлдлийг буцаах боломжгүй.`
      )
    ) {
      return
    }

    const success = await deleteClient(clientId)
    if (success) {
      showToast('Клиент устгагдлаа', 'success')
    } else {
      showToast('Алдаа гарлаа', 'error')
    }
  }

  const handleSubmit = async (data: CreateClientDTO) => {
    if (editClient) {
      const success = await updateClient(editClient.id, data)
      if (success) {
        showToast('Клиент шинэчлэгдлээ', 'success')
        setModalOpen(false)
        return null
      } else {
        showToast('Алдаа гарлаа', 'error')
        return null
      }
    } else {
      const result = await createClient(data)
      if (result) {
        showToast('Клиент үүсгэгдлээ', 'success')
        return result
      } else {
        showToast('Алдаа гарлаа', 'error')
        return null
      }
    }
  }

  if (!apiKey) {
    return null
  }

  return (
    <div className="max-w-[1200px] mx-auto px-5 py-6 min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 pb-5 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-3">
          <Image src="/assets/logo.png" alt="Gerege" width={32} height={32} className="rounded-lg" />
          Admin Dashboard
        </h1>
        <Button variant="danger" size="sm" onClick={handleLogout}>
          Гарах
        </Button>
      </header>

      {/* Stats */}
      <div className="mb-8">
        <StatsGrid stats={stats} isLoading={isLoading && !stats} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5">
        <button
          className={cn(
            'px-5 py-2.5 rounded-t-xl text-sm font-medium border border-slate-200 dark:border-slate-700 transition-all',
            activeTab === 'clients'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-b-transparent'
              : 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          )}
          onClick={() => handleTabChange('clients')}
        >
          OAuth Клиентүүд
        </button>
        <button
          className={cn(
            'px-5 py-2.5 rounded-t-xl text-sm font-medium border border-slate-200 dark:border-slate-700 transition-all',
            activeTab === 'logs'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-b-transparent'
              : 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          )}
          onClick={() => handleTabChange('logs')}
        >
          Audit Logs
        </button>
      </div>

      {/* Panels */}
      <div className="glass rounded-none rounded-tr-2xl rounded-b-2xl p-6">
        {activeTab === 'clients' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">OAuth2 Клиентүүд</h2>
              <Button variant="primary" size="sm" onClick={handleOpenCreate}>
                + Шинэ клиент
              </Button>
            </div>
            <ClientsTable
              clients={clients}
              isLoading={isLoading && clients.length === 0}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </>
        )}

        {activeTab === 'logs' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Сүүлийн үйлдлүүд</h2>
              <Button variant="ghost" size="sm" onClick={fetchAuditLogs}>
                Шинэчлэх
              </Button>
            </div>
            <AuditLogs logs={auditLogs} isLoading={isLoading && auditLogs.length === 0} />
          </>
        )}
      </div>

      {/* Client Modal */}
      <ClientModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        client={editClient}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
