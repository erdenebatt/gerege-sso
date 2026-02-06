'use client'

import Image from 'next/image'
import Link from 'next/link'
import { OAuthButtons } from './OAuthButtons'
import { useTranslation } from '@/stores/settingsStore'

interface LoginCardProps {
  error?: string | null
}

export function LoginCard({ error }: LoginCardProps) {
  const t = useTranslation()

  return (
    <div className="w-full max-w-md relative z-10 animate-fade-in">
      {/* Logo and Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center mb-5">
          <Image
            src="/assets/logo.png"
            alt="Gerege SSO"
            width={72}
            height={72}
            className="rounded-2xl"
            priority
          />
        </div>
        <h1 className="text-2xl font-bold mb-2">
          Gerege <span className="gradient-text">SSO</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-sm">
          {t.subtitle}
        </p>
      </div>

      {/* Login Card */}
      <div className="card p-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <OAuthButtons />

        <div className="divider my-6">{t.or}</div>

        <p className="text-sm text-slate-600 dark:text-slate-300 text-center leading-relaxed">
          {t.loginDescription}
        </p>
      </div>

      {/* Footer Links */}
      <div className="mt-8 text-center">
        <p className="text-slate-500 dark:text-slate-400 text-xs mb-3">
          {t.copyright}
        </p>
        <div className="flex items-center justify-center gap-3 text-xs">
          <Link
            href="/privacy"
            className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {t.privacy}
          </Link>
          <span className="text-slate-400 dark:text-slate-500">•</span>
          <Link
            href="/terms"
            className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {t.terms}
          </Link>
          <span className="text-slate-400 dark:text-slate-500">•</span>
          <Link
            href="/docs"
            className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {t.api}
          </Link>
        </div>
      </div>
    </div>
  )
}
