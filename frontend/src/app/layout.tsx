import type { Metadata } from 'next'
import { ToastProvider } from '@/components/ui'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Gerege SSO',
  description: 'Нэгдсэн нэвтрэлтийн систем',
  icons: {
    icon: '/assets/logo.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="mn">
      <body className="text-white min-h-screen">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
