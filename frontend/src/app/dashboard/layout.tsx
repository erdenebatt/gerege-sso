'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { Sidebar, DashboardHeader } from '@/components/layout'
import { Skeleton } from '@/components/ui'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const { token, user, isLoading, fetchUser, fetchGrants } = useAuthStore()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => {
        if (!token) {
            router.replace('/?redirect=/dashboard')
            return
        }

        // Only fetch if not already present or force refresh logic
        fetchUser()
        fetchGrants()
    }, [token, fetchUser, fetchGrants, router])

    const getTitle = () => {
        if (pathname?.includes('/security')) return 'Нууцлал'
        if (pathname?.includes('/dan')) return 'ДАН баталгаажуулалт'
        if (pathname?.includes('/activity')) return 'Үйл ажиллагаа'
        if (pathname?.includes('/grants')) return 'Холбогдсон апп'
        return 'Хянах самбар'
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

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <Sidebar />

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            <div className="lg:pl-64">
                <DashboardHeader
                    onMobileMenuOpen={() => setMobileMenuOpen(true)}
                    title={getTitle()}
                />
                {children}
            </div>
        </div>
    )
}
