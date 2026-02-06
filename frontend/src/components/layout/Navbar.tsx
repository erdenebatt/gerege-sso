'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useAuthStore } from '@/stores/authStore'
import { getInitials } from '@/lib/utils'

interface NavbarProps {
  showUser?: boolean
}

export function Navbar({ showUser = true }: NavbarProps) {
  const { user, logout } = useAuthStore()

  return (
    <nav className="glass sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/assets/logo.png"
              alt="Gerege"
              width={32}
              height={32}
              className="rounded-lg"
              priority
            />
            <span className="font-semibold text-lg text-slate-900 dark:text-white">Gerege SSO</span>
          </Link>

          {showUser && user && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                  {user.picture ? (
                    <Image
                      src={user.picture}
                      alt=""
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <span className="text-xs font-bold text-white">
                      {getInitials(user.gerege?.name || user.email)}
                    </span>
                  )}
                </div>
                <span>{user.email}</span>
              </div>
              <button
                onClick={logout}
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                Гарах
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
