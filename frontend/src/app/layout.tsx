import type { Metadata } from 'next'
import { ToastProvider } from '@/components/ui'
import { ThemeProvider } from '@/components/ThemeProvider'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Gerege SSO - Нэгдсэн нэвтрэлтийн систем',
  description: 'Gerege нэгдсэн нэвтрэлтийн систем',
  icons: {
    icon: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
