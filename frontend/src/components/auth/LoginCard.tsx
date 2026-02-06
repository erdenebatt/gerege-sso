'use client'

import Image from 'next/image'
import Link from 'next/link'
import { OAuthButtons } from './OAuthButtons'

interface LoginCardProps {
  error?: string | null
}

export function LoginCard({ error }: LoginCardProps) {
  return (
    <div className="glass rounded-2xl p-10 w-full max-w-[420px] text-center">
      <div className="mb-5">
        <Image
          src="/assets/logo.svg"
          alt="Gerege SSO"
          width={80}
          height={80}
          className="mx-auto"
          priority
        />
      </div>

      <h1 className="text-3xl font-semibold mb-2">Gerege SSO</h1>
      <p className="text-white/70 text-sm mb-8">Нэгдсэн нэвтрэлтийн систем</p>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-5 text-sm">
          {error}
        </div>
      )}

      <OAuthButtons />

      <div className="flex items-center my-6">
        <div className="flex-1 h-px bg-white/20" />
        <span className="px-4 text-xs text-white/50">эсвэл</span>
        <div className="flex-1 h-px bg-white/20" />
      </div>

      <p className="text-sm text-white/60 leading-relaxed">
        Google, Apple эсвэл Facebook бүртгэлээр нэвтэрч, регистрийн дугаараараа
        баталгаажуулна уу.
      </p>

      <footer className="mt-8 pt-6 border-t border-white/10">
        <p className="text-white/40 text-xs mb-2">
          &copy; 2024 Gerege SSO. Бүх эрх хуулиар хамгаалагдсан.
        </p>
        <div className="flex items-center justify-center gap-2 text-xs">
          <Link href="/privacy" className="text-white/50 hover:text-gerege-primary transition-colors">
            Нууцлалын бодлого
          </Link>
          <span className="text-white/30">|</span>
          <Link href="/terms" className="text-white/50 hover:text-gerege-primary transition-colors">
            Үйлчилгээний нөхцөл
          </Link>
          <span className="text-white/30">|</span>
          <Link href="/data-deletion" className="text-white/50 hover:text-gerege-primary transition-colors">
            Өгөгдөл устгах
          </Link>
        </div>
      </footer>
    </div>
  )
}
