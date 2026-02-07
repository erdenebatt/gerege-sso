'use client'

import Image from 'next/image'

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-slate-900 dark:bg-black border border-slate-700 p-4 rounded-xl text-sm overflow-x-auto font-mono">
      <code className="text-green-400">{children}</code>
    </pre>
  )
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 md:p-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          {icon}
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Step({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-bold">
        {num}
      </div>
      <div className="text-slate-600 dark:text-slate-300 pt-1">{children}</div>
    </div>
  )
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Hero */}
      <section className="pt-16 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/assets/logo.png"
              alt="Gerege"
              width={64}
              height={64}
              className="rounded-2xl"
              priority
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Gerege SSO{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
              API
            </span>
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-8">
            OAuth 2.0 стандартын дагуу ажилладаг нэгдсэн нэвтрэлтийн систем. Аппликейшндаа интеграци
            хийж хэрэглэгчдийг баталгаажуулаарай.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://sso.gerege.mn/swagger/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/25"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              Swagger UI
            </a>
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm text-slate-600 dark:text-slate-300">
              https://sso.gerege.mn
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="pb-20 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Quick Start */}
          <SectionCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            }
            title="Хурдан эхлэх"
          >
            <div className="space-y-5">
              <Step num={1}>
                Хэрэглэгчийг{' '}
                <code className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-indigo-600 dark:text-indigo-300 text-sm">
                  /api/oauth/authorize
                </code>{' '}
                руу redirect хийнэ
              </Step>
              <Step num={2}>Хэрэглэгч Gerege-ээр нэвтэрч зөвшөөрнө</Step>
              <Step num={3}>
                Authorization code-ийг{' '}
                <code className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-indigo-600 dark:text-indigo-300 text-sm">
                  /api/oauth/token
                </code>{' '}
                endpoint-оор access token болгож солино
              </Step>
              <Step num={4}>Access token-оор хэрэглэгчийн мэдээлэл авна</Step>
            </div>
          </SectionCard>

          {/* Authorization Request */}
          <SectionCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            }
            title="Authorization Request"
          >
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Хэрэглэгчийг нэвтрэх хуудас руу дараах URL-ээр redirect хийнэ:
            </p>
            <CodeBlock>{`GET /api/oauth/authorize
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https://yourapp.com/callback
  &response_type=code
  &scope=openid profile
  &state=RANDOM_STRING`}</CodeBlock>

            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              {[
                { param: 'client_id', desc: 'Бүртгэгдсэн OAuth client ID' },
                { param: 'redirect_uri', desc: 'Зөвшөөрсний дараа буцах URL' },
                { param: 'response_type', desc: '"code" байх ёстой' },
                { param: 'scope', desc: 'openid, profile, email' },
                { param: 'state', desc: 'CSRF хамгаалалтын random string' },
                { param: 'code_challenge', desc: 'PKCE (заавал биш)' },
              ].map((item) => (
                <div key={item.param} className="flex gap-2 text-sm">
                  <code className="text-indigo-600 dark:text-indigo-400 font-medium whitespace-nowrap">
                    {item.param}
                  </code>
                  <span className="text-slate-500 dark:text-slate-400">— {item.desc}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Token Exchange */}
          <SectionCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            }
            title="Token Exchange"
          >
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Authorization code-ийг access token-оор солино:
            </p>
            <CodeBlock>{`POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTH_CODE
&redirect_uri=https://yourapp.com/callback
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET`}</CodeBlock>

            <p className="text-slate-500 dark:text-slate-400 mt-5 mb-3">Response:</p>
            <CodeBlock>{`{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}`}</CodeBlock>
          </SectionCard>

          {/* User Info */}
          <SectionCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            }
            title="Хэрэглэгчийн мэдээлэл"
          >
            <CodeBlock>{`GET /api/auth/me
Authorization: Bearer ACCESS_TOKEN`}</CodeBlock>

            <p className="text-slate-500 dark:text-slate-400 mt-5 mb-3">Response:</p>
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
          </SectionCard>

          {/* JWT Structure */}
          <SectionCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            }
            title="JWT Token"
          >
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Access token нь JWT форматтай. Payload:
            </p>
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
          </SectionCard>

          {/* Scopes & Errors */}
          <div className="grid md:grid-cols-2 gap-8">
            <SectionCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              }
              title="Scopes"
            >
              <div className="space-y-3">
                {[
                  { scope: 'openid', desc: 'Бүх хүсэлтэд заавал' },
                  { scope: 'profile', desc: 'Хэрэглэгчийн профайл мэдээлэл' },
                  { scope: 'email', desc: 'И-мэйл хаяг' },
                ].map((item) => (
                  <div key={item.scope} className="flex items-center gap-3">
                    <code className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium">
                      {item.scope}
                    </code>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              }
              title="Алдааны хариу"
            >
              <CodeBlock>{`{
  "error": "invalid_token",
  "error_description": "Access token хүчингүй"
}`}</CodeBlock>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex gap-2">
                  <code className="text-red-500">400</code>
                  <span className="text-slate-500 dark:text-slate-400">Буруу хүсэлт</span>
                </div>
                <div className="flex gap-2">
                  <code className="text-red-500">401</code>
                  <span className="text-slate-500 dark:text-slate-400">Зөвшөөрөлгүй</span>
                </div>
                <div className="flex gap-2">
                  <code className="text-red-500">404</code>
                  <span className="text-slate-500 dark:text-slate-400">Олдсонгүй</span>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Contact */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-center text-white">
            <h3 className="text-xl font-bold mb-2">Асуулт байна уу?</h3>
            <p className="text-indigo-100 mb-6">
              API интеграцитай холбоотой асуудлаар холбогдоорой
            </p>
            <a
              href="mailto:dev@gerege.mn"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-xl font-medium hover:bg-indigo-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              dev@gerege.mn
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
