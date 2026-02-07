'use client'

import { Header } from '@/components/layout'

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-slate-900 dark:bg-black border border-slate-700 p-4 rounded-xl text-sm overflow-x-auto font-mono">
      <code className="text-green-400">{children}</code>
    </pre>
  )
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 md:p-10">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 pb-5 border-b border-slate-200 dark:border-slate-700">
            API баримтжуулалт
          </h1>

          <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-xl p-4 mb-8">
            <p className="text-slate-700 dark:text-slate-300">
              Gerege SSO нь OAuth 2.0 стандартын дагуу ажилладаг нэгдсэн нэвтрэлтийн систем юм.
              Дэлгэрэнгүй API тестийг{' '}
              <a
                href="https://sso.gerege.mn/swagger/index.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium transition-colors"
              >
                Swagger UI
              </a>
              -ээр харна уу.
            </p>
          </div>

          <div className="space-y-8 text-slate-600 dark:text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                1. Хурдан эхлэх
              </h2>
              <p className="mb-3">OAuth 2.0 Authorization Code Flow:</p>
              <ol className="list-decimal pl-6 space-y-2 text-slate-500 dark:text-slate-400">
                <li>
                  Хэрэглэгчийг{' '}
                  <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-indigo-600 dark:text-indigo-300 text-sm">
                    /api/oauth/authorize
                  </code>{' '}
                  руу redirect хийнэ
                </li>
                <li>Хэрэглэгч Gerege-ээр нэвтэрч зөвшөөрнө</li>
                <li>
                  Authorization code-ийг{' '}
                  <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-indigo-600 dark:text-indigo-300 text-sm">
                    /api/oauth/token
                  </code>{' '}
                  endpoint-оор access token болгож солино
                </li>
                <li>Access token-оор хэрэглэгчийн мэдээлэл авна</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                2. Authorization Request
              </h2>
              <p className="mb-3">Хэрэглэгчийг нэвтрэх хуудас руу дараах URL-ээр redirect хийнэ:</p>
              <CodeBlock>{`GET /api/oauth/authorize
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https://yourapp.com/callback
  &response_type=code
  &scope=openid profile
  &state=RANDOM_STRING`}</CodeBlock>
              <div className="mt-4 space-y-2 text-sm">
                <p className="font-medium text-slate-700 dark:text-slate-200 mb-2">Параметрууд:</p>
                <ul className="list-disc pl-6 space-y-1 text-slate-500 dark:text-slate-400">
                  <li>
                    <code className="text-indigo-600 dark:text-indigo-400">client_id</code> —
                    Бүртгэгдсэн OAuth client ID
                  </li>
                  <li>
                    <code className="text-indigo-600 dark:text-indigo-400">redirect_uri</code> —
                    Зөвшөөрсний дараа буцах URL
                  </li>
                  <li>
                    <code className="text-indigo-600 dark:text-indigo-400">response_type</code> —
                    &quot;code&quot; байх ёстой
                  </li>
                  <li>
                    <code className="text-indigo-600 dark:text-indigo-400">scope</code> — openid,
                    profile, email
                  </li>
                  <li>
                    <code className="text-indigo-600 dark:text-indigo-400">state</code> — CSRF
                    хамгаалалтын random string
                  </li>
                  <li>
                    <code className="text-indigo-600 dark:text-indigo-400">code_challenge</code> —
                    PKCE (заавал биш)
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                3. Token Exchange
              </h2>
              <p className="mb-3">Authorization code-ийг access token-оор солино:</p>
              <CodeBlock>{`POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTH_CODE
&redirect_uri=https://yourapp.com/callback
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET`}</CodeBlock>
              <p className="mt-4 mb-3 font-medium text-slate-700 dark:text-slate-200">Response:</p>
              <CodeBlock>{`{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}`}</CodeBlock>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                4. Хэрэглэгчийн мэдээлэл
              </h2>
              <p className="mb-3">Access token ашиглан хэрэглэгчийн мэдээлэл авах:</p>
              <CodeBlock>{`GET /api/auth/me
Authorization: Bearer ACCESS_TOKEN`}</CodeBlock>
              <p className="mt-4 mb-3 font-medium text-slate-700 dark:text-slate-200">Response:</p>
              <CodeBlock>{`{
  "gen_id": "12345678901",
  "email": "user@example.com",
  "verified": true,
  "gerege": {
    "reg_no": "AA12345678",
    "family_name": "Ургийн овог",
    "last_name": "Овог",
    "first_name": "Нэр",
    "name": "Овог Нэр",
    "birth_date": "1990-01-01",
    "gender": "M",
    "verified": true
  }
}`}</CodeBlock>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                5. JWT Token бүтэц
              </h2>
              <p className="mb-3">Access token нь JWT форматтай. Payload:</p>
              <CodeBlock>{`{
  "sub": "12345678901",
  "email": "user@example.com",
  "verified": true,
  "gerege": {
    "reg_no": "AA12345678",
    "first_name": "Нэр",
    "last_name": "Овог",
    "verified": true
  },
  "iat": 1234567890,
  "exp": 1234571490
}`}</CodeBlock>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                6. Scopes
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-slate-500 dark:text-slate-400">
                <li>
                  <code className="text-indigo-600 dark:text-indigo-400">openid</code> — Бүх
                  хүсэлтэд заавал
                </li>
                <li>
                  <code className="text-indigo-600 dark:text-indigo-400">profile</code> —
                  Хэрэглэгчийн профайл мэдээлэл
                </li>
                <li>
                  <code className="text-indigo-600 dark:text-indigo-400">email</code> — И-мэйл хаяг
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                7. Алдааны хариу
              </h2>
              <CodeBlock>{`{
  "error": "invalid_token",
  "error_description": "Access token хүчингүй"
}`}</CodeBlock>
              <div className="mt-4 space-y-2 text-sm">
                <p className="font-medium text-slate-700 dark:text-slate-200 mb-2">
                  HTTP статус кодууд:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-slate-500 dark:text-slate-400">
                  <li>
                    <code className="text-red-500">400</code> — Буруу хүсэлт
                  </li>
                  <li>
                    <code className="text-red-500">401</code> — Зөвшөөрөлгүй
                  </li>
                  <li>
                    <code className="text-red-500">403</code> — Хандах эрхгүй
                  </li>
                  <li>
                    <code className="text-red-500">404</code> — Олдсонгүй
                  </li>
                  <li>
                    <code className="text-red-500">429</code> — Хэт олон хүсэлт
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                8. Холбоо барих
              </h2>
              <p>
                API интеграцитай холбоотой асуудлаар:{' '}
                <a
                  href="mailto:dev@gerege.mn"
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
                >
                  dev@gerege.mn
                </a>
              </p>
            </section>

            <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500">
              Base URL: https://sso.gerege.mn
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
