'use client'

import Image from 'next/image'
import Link from 'next/link'
import { OAuthButtons } from './OAuthButtons'

interface LoginCardProps {
  error?: string | null
}

export function LoginCard({ error }: LoginCardProps) {
  return (
    <div className="w-full max-w-md animate-fade-in">
      {/* Logo and Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl mb-6 shadow-lg shadow-blue-600/25">
          <Image
            src="/assets/logo.svg"
            alt="Gerege SSO"
            width={48}
            height={48}
            className="brightness-0 invert"
            priority
          />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Gerege SSO
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Нэгдсэн нэвтрэлтийн систем
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 p-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <OAuthButtons />

        <div className="divider-text my-6">эсвэл</div>

        <p className="text-sm text-slate-500 dark:text-slate-400 text-center leading-relaxed">
          Google, Apple эсвэл Facebook бүртгэлээр нэвтэрч,
          регистрийн дугаараараа баталгаажуулна уу.
        </p>
      </div>

      {/* Footer Links */}
      <div className="mt-8 text-center">
        <p className="text-slate-400 dark:text-slate-500 text-xs mb-3">
          &copy; 2024 Gerege SSO. Бүх эрх хуулиар хамгаалагдсан.
        </p>
        <div className="flex items-center justify-center gap-3 text-xs">
          <Link
            href="/privacy"
            className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Нууцлалын бодлого
          </Link>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <Link
            href="/terms"
            className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Үйлчилгээний нөхцөл
          </Link>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <Link
            href="/docs"
            className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            API
          </Link>
        </div>
      </div>
    </div>
  )
}
