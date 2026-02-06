import type { Metadata } from 'next'
import { ToastProvider } from '@/components/ui'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Gerege SSO - Нэгдсэн нэвтрэлтийн систем',
  description: 'Gerege нэгдсэн нэвтрэлтийн систем',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
