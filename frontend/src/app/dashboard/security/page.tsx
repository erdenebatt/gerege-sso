'use client'

import { useAuthStore } from '@/stores/authStore'
import { SecurityCard } from '@/components/dashboard'

export default function SecurityPage() {
    const { user } = useAuthStore()

    if (!user) return null

    return (
        <div className="p-6 max-w-2xl">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    Аюулгүй байдал
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                    Таны бүртгэлийн аюулгүй байдлын тохиргоо
                </p>
            </div>
            <SecurityCard user={user} />
        </div>
    )
}
