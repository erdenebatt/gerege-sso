'use client'

import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-auto py-6 text-center">
      <p className="text-white/40 text-xs mb-2">
        &copy; 2024 Gerege SSO. Бүх эрх хуулиар хамгаалагдсан.
      </p>
      <div className="flex items-center justify-center gap-2 text-xs">
        <Link
          href="/privacy"
          className="text-white/50 hover:text-gerege-primary transition-colors"
        >
          Нууцлалын бодлого
        </Link>
        <span className="text-white/30">|</span>
        <Link
          href="/terms"
          className="text-white/50 hover:text-gerege-primary transition-colors"
        >
          Үйлчилгээний нөхцөл
        </Link>
        <span className="text-white/30">|</span>
        <Link
          href="/data-deletion"
          className="text-white/50 hover:text-gerege-primary transition-colors"
        >
          Өгөгдөл устгах
        </Link>
      </div>
    </footer>
  )
}
