'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gerege-primary text-sm mb-6 hover:underline"
      >
        ← Нүүр хуудас руу буцах
      </Link>

      <div className="glass rounded-2xl p-10">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/20">
          <Image src="/assets/logo.svg" alt="Gerege" width={48} height={48} />
          <div>
            <h1 className="text-2xl font-bold">Gerege SSO API</h1>
            <p className="text-white/60">Developer Documentation</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none">
          <h2 className="text-gerege-primary">Тойм</h2>
          <p className="text-white/85 leading-relaxed">
            Gerege SSO нь OAuth 2.0 стандартын дагуу ажилладаг нэгдсэн
            нэвтрэлтийн систем юм. Энэ баримт бичигт API endpoints,
            Authentication flow, болон хэрхэн интеграци хийх талаар тайлбарласан
            болно.
          </p>

          <h2 className="text-gerege-primary mt-8">Үндсэн URL</h2>
          <code className="block bg-black/30 p-4 rounded-lg text-gerege-primary">
            https://sso.gerege.mn
          </code>

          <h2 className="text-gerege-primary mt-8">Authentication</h2>

          <h3 className="text-white mt-6">OAuth 2.0 Authorization Code Flow</h3>
          <ol className="text-white/85 space-y-2">
            <li>
              1. Хэрэглэгчийг <code>/api/oauth/authorize</code> руу redirect
              хийнэ
            </li>
            <li>2. Хэрэглэгч зөвшөөрсний дараа authorization code буцаана</li>
            <li>
              3. Authorization code-ийг access token-оор солино (
              <code>/api/oauth/token</code>)
            </li>
            <li>4. Access token-оор хэрэглэгчийн мэдээлэл авна</li>
          </ol>

          <h3 className="text-white mt-6">Authorization Request</h3>
          <code className="block bg-black/30 p-4 rounded-lg text-sm overflow-x-auto">
            {`GET /api/oauth/authorize
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https://yourapp.com/callback
  &response_type=code
  &scope=openid profile
  &state=RANDOM_STRING`}
          </code>

          <h3 className="text-white mt-6">Token Request</h3>
          <code className="block bg-black/30 p-4 rounded-lg text-sm overflow-x-auto">
            {`POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTH_CODE
&redirect_uri=https://yourapp.com/callback
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET`}
          </code>

          <h2 className="text-gerege-primary mt-8">API Endpoints</h2>

          <h3 className="text-white mt-6">User Info</h3>
          <code className="block bg-black/30 p-4 rounded-lg text-sm">
            {`GET /api/auth/me
Authorization: Bearer ACCESS_TOKEN`}
          </code>

          <h4 className="text-white/80 mt-4">Response:</h4>
          <code className="block bg-black/30 p-4 rounded-lg text-sm overflow-x-auto">
            {`{
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
}`}
          </code>

          <h2 className="text-gerege-primary mt-8">JWT Token Structure</h2>
          <p className="text-white/85">
            Access token нь JWT форматтай бөгөөд дараах payload-ийг агуулна:
          </p>
          <code className="block bg-black/30 p-4 rounded-lg text-sm overflow-x-auto">
            {`{
  "sub": "12345678901",  // gen_id
  "email": "user@example.com",
  "verified": true,
  "gerege": { ... },
  "iat": 1234567890,
  "exp": 1234571490
}`}
          </code>

          <h2 className="text-gerege-primary mt-8">Scopes</h2>
          <ul className="text-white/85 space-y-1">
            <li>
              <code>openid</code> - Required for all requests
            </li>
            <li>
              <code>profile</code> - User profile information
            </li>
            <li>
              <code>email</code> - User email address
            </li>
          </ul>

          <h2 className="text-gerege-primary mt-8">Error Responses</h2>
          <code className="block bg-black/30 p-4 rounded-lg text-sm">
            {`{
  "error": "invalid_token",
  "error_description": "The access token is invalid"
}`}
          </code>

          <div className="mt-10 p-6 bg-gerege-primary/10 border border-gerege-primary/30 rounded-xl">
            <h3 className="text-gerege-primary mb-2">Холбоо барих</h3>
            <p className="text-white/70 text-sm">
              API-тай холбоотой асуулт байвал:{' '}
              <a
                href="mailto:dev@gerege.mn"
                className="text-gerege-primary hover:underline"
              >
                dev@gerege.mn
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
