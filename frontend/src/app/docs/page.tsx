'use client'

import Image from 'next/image'
import { Sidebar, UserDropdown } from '@/components/layout'
import { useSettingsStore } from '@/stores/settingsStore'

export default function DocsPage() {
  const { theme, toggleTheme } = useSettingsStore()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />

      <div className="lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-40 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            API баримтжуулалт
          </h1>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <div className="pl-2 border-l border-slate-200 dark:border-slate-700 ml-2">
              <UserDropdown />
            </div>
          </div>
        </header>

        <main className="p-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 md:p-10">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-200 dark:border-slate-700">
              <Image src="/assets/logo.png" alt="Gerege" width={48} height={48} className="rounded-xl" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gerege SSO API</h1>
                <p className="text-slate-500 dark:text-slate-400">Developer Documentation</p>
              </div>
            </div>

            <div className="space-y-8 text-slate-600 dark:text-slate-300">
              <section>
                <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">Тойм</h2>
                <p className="leading-relaxed">
                  Gerege SSO нь OAuth 2.0 стандартын дагуу ажилладаг нэгдсэн
                  нэвтрэлтийн систем юм. Энэ баримт бичигт API endpoints,
                  Authentication flow, болон хэрхэн интеграци хийх талаар тайлбарласан
                  болно.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">Үндсэн URL</h2>
                <code className="block bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl text-indigo-600 dark:text-indigo-400 font-mono">
                  https://sso.gerege.mn
                </code>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">Authentication</h2>

                <h3 className="text-slate-900 dark:text-white font-medium mt-6 mb-3">OAuth 2.0 Authorization Code Flow</h3>
                <ol className="space-y-2 text-slate-500 dark:text-slate-400">
                  <li className="flex gap-3">
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">1.</span>
                    Хэрэглэгчийг <code className="text-indigo-600 dark:text-indigo-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">/api/oauth/authorize</code> руу redirect хийнэ
                  </li>
                  <li className="flex gap-3">
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">2.</span>
                    Хэрэглэгч зөвшөөрсний дараа authorization code буцаана
                  </li>
                  <li className="flex gap-3">
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">3.</span>
                    Authorization code-ийг access token-оор солино (<code className="text-indigo-600 dark:text-indigo-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">/api/oauth/token</code>)
                  </li>
                  <li className="flex gap-3">
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">4.</span>
                    Access token-оор хэрэглэгчийн мэдээлэл авна
                  </li>
                </ol>

                <h3 className="text-slate-900 dark:text-white font-medium mt-8 mb-3">Authorization Request</h3>
                <pre className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl text-sm overflow-x-auto font-mono">
                  <code className="text-slate-700 dark:text-slate-300">{`GET /api/oauth/authorize
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https://yourapp.com/callback
  &response_type=code
  &scope=openid profile
  &state=RANDOM_STRING`}</code>
                </pre>

                <h3 className="text-slate-900 dark:text-white font-medium mt-8 mb-3">Token Request</h3>
                <pre className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl text-sm overflow-x-auto font-mono">
                  <code className="text-slate-700 dark:text-slate-300">{`POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTH_CODE
&redirect_uri=https://yourapp.com/callback
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET`}</code>
                </pre>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">API Endpoints</h2>

                <h3 className="text-slate-900 dark:text-white font-medium mt-6 mb-3">User Info</h3>
                <pre className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl text-sm font-mono">
                  <code className="text-slate-700 dark:text-slate-300">{`GET /api/auth/me
Authorization: Bearer ACCESS_TOKEN`}</code>
                </pre>

                <h4 className="text-slate-500 dark:text-slate-400 mt-4 mb-2">Response:</h4>
                <pre className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl text-sm overflow-x-auto font-mono">
                  <code className="text-slate-700 dark:text-slate-300">{`{
  "gen_id": "12345678901",
  "email": "user@example.com",
  "verified": true,
  "gerege": {
    "family_name": "...",
    "last_name": "...",
    "first_name": "...",
    "birth_date": "1990-01-01",
    "gender": "male"
  }
}`}</code>
                </pre>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">JWT Token Structure</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  Access token нь JWT форматтай бөгөөд дараах payload-ийг агуулна:
                </p>
                <pre className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl text-sm overflow-x-auto font-mono">
                  <code className="text-slate-700 dark:text-slate-300">{`{
  "sub": "12345678901",  // gen_id
  "email": "user@example.com",
  "verified": true,
  "gerege": { ... },
  "iat": 1234567890,
  "exp": 1234571490
}`}</code>
                </pre>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">Scopes</h2>
                <ul className="space-y-2 text-slate-500 dark:text-slate-400">
                  <li>
                    <code className="text-indigo-600 dark:text-indigo-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">openid</code>
                    <span className="ml-2">- Required for all requests</span>
                  </li>
                  <li>
                    <code className="text-indigo-600 dark:text-indigo-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">profile</code>
                    <span className="ml-2">- User profile information</span>
                  </li>
                  <li>
                    <code className="text-indigo-600 dark:text-indigo-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">email</code>
                    <span className="ml-2">- User email address</span>
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">Error Responses</h2>
                <pre className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl text-sm font-mono">
                  <code className="text-slate-700 dark:text-slate-300">{`{
  "error": "invalid_token",
  "error_description": "The access token is invalid"
}`}</code>
                </pre>
              </section>

              <div className="mt-10 p-6 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-xl">
                <h3 className="text-indigo-600 dark:text-indigo-400 font-semibold mb-2">Холбоо барих</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  API-тай холбоотой асуулт байвал:{' '}
                  <a
                    href="mailto:dev@gerege.mn"
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
                  >
                    dev@gerege.mn
                  </a>
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
