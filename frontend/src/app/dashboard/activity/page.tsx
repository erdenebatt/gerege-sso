'use client'

import { useAuthStore } from '@/stores/authStore'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { formatDateTime } from '@/lib/utils'

export default function ActivityPage() {
    const { user } = useAuthStore()

    if (!user) return null

    return (
        <div className="p-6 max-w-4xl">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    Үйл ажиллагаа
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                    Таны сүүлийн үеийн нэвтрэлт болон үйлдлүүд
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Нэвтрэлтийн түүх</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="font-medium text-slate-900 dark:text-white">Амжилттай нэвтэрсэн</div>
                                    <div className="text-sm text-slate-500">Gerege SSO - Web</div>
                                </div>
                            </div>
                            <div className="text-sm text-slate-500">
                                {user.updated_at ? formatDateTime(user.updated_at) : '—'}
                            </div>
                        </div>

                        {/* Simulated previous entry */}
                        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 opacity-60">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="font-medium text-slate-900 dark:text-white">Амжилттай нэвтэрсэн</div>
                                    <div className="text-sm text-slate-500">Gerege SSO - Web</div>
                                </div>
                            </div>
                            <div className="text-sm text-slate-500">
                                {user.created_at ? formatDateTime(user.created_at) : '—'}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
