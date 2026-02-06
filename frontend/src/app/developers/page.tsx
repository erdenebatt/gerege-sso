'use client'

import Image from 'next/image'
import { Header } from '@/components/layout'

export default function DevelopersPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24">
        <div className="card p-8 md:p-10">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/20">
          <Image src="/assets/logo.svg" alt="Gerege" width={48} height={48} />
          <div>
            <h1 className="text-2xl font-bold">Sign in with Gerege</h1>
            <p className="text-white/60">Developer Integration Guide</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none">
          <h2 className="text-gerege-primary">Танилцуулга</h2>
          <p className="text-white/85 leading-relaxed">
            &quot;Sign in with Gerege&quot; нь OAuth 2.0 стандартын дагуу хэрэглэгчдийг
            баталгаажуулах найдвартай арга юм. Энэхүү гарын авлагад хэрхэн
            таны аппликейшнд интеграци хийхийг тайлбарласан болно.
          </p>

          <h2 className="text-gerege-primary mt-8">Бүртгүүлэх</h2>
          <ol className="text-white/85 space-y-2">
            <li>
              1. Admin хэсгээс OAuth Client үүсгэж, Client ID болон Client Secret
              авна
            </li>
            <li>2. Redirect URI-аа тохируулна (https://yourapp.com/callback)</li>
            <li>3. Шаардлагатай scopes-оо сонгоно</li>
          </ol>

          <h2 className="text-gerege-primary mt-8">PKCE Flow (Recommended)</h2>
          <p className="text-white/85">
            Mobile болон SPA аппликейшнуудад PKCE (Proof Key for Code Exchange)
            ашиглахыг зөвлөж байна.
          </p>

          <h3 className="text-white mt-6">1. Code Verifier үүсгэх</h3>
          <code className="block bg-black/30 p-4 rounded-lg text-sm overflow-x-auto">
            {`const codeVerifier = generateRandomString(128);
const codeChallenge = base64urlencode(sha256(codeVerifier));`}
          </code>

          <h3 className="text-white mt-6">2. Authorization Request</h3>
          <code className="block bg-black/30 p-4 rounded-lg text-sm overflow-x-auto">
            {`const authUrl = 'https://sso.gerege.mn/api/oauth/authorize?' +
  'client_id=' + CLIENT_ID +
  '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) +
  '&response_type=code' +
  '&scope=openid+profile' +
  '&state=' + state +
  '&code_challenge=' + codeChallenge +
  '&code_challenge_method=S256';

window.location.href = authUrl;`}
          </code>

          <h3 className="text-white mt-6">3. Token Exchange</h3>
          <code className="block bg-black/30 p-4 rounded-lg text-sm overflow-x-auto">
            {`const response = await fetch('https://sso.gerege.mn/api/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authCode,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: codeVerifier
  })
});

const { access_token } = await response.json();`}
          </code>

          <h2 className="text-gerege-primary mt-8">Sign-in Button</h2>
          <p className="text-white/85">
            Gerege брэндийн дагуу бэлэн товчлуур ашиглах боломжтой:
          </p>

          <div className="grid sm:grid-cols-3 gap-4 my-6">
            <div className="p-4 bg-white/5 rounded-xl text-center">
              <button className="w-full py-3 px-4 bg-gradient-to-r from-gerege-primary to-gerege-secondary text-gerege-dark font-semibold rounded-lg flex items-center justify-center gap-2">
                <Image src="/assets/logo.svg" alt="" width={20} height={20} />
                Sign in with Gerege
              </button>
              <p className="text-xs text-white/40 mt-2">Branded</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl text-center">
              <button className="w-full py-3 px-4 bg-gerege-dark border border-white/20 text-white font-semibold rounded-lg flex items-center justify-center gap-2">
                <Image src="/assets/logo.svg" alt="" width={20} height={20} />
                Sign in with Gerege
              </button>
              <p className="text-xs text-white/40 mt-2">Dark</p>
            </div>
            <div className="p-4 bg-white rounded-xl text-center">
              <button className="w-full py-3 px-4 bg-white border border-gray-200 text-gray-800 font-semibold rounded-lg flex items-center justify-center gap-2">
                <Image src="/assets/logo.svg" alt="" width={20} height={20} />
                Sign in with Gerege
              </button>
              <p className="text-xs text-gray-400 mt-2">Light</p>
            </div>
          </div>

          <h3 className="text-white mt-6">CSS Library</h3>
          <code className="block bg-black/30 p-4 rounded-lg text-sm">
            {`<link rel="stylesheet" href="https://sso.gerege.mn/assets/brand/gerege-signin.css">`}
          </code>

          <h3 className="text-white mt-6">Button HTML</h3>
          <code className="block bg-black/30 p-4 rounded-lg text-sm overflow-x-auto">
            {`<a href="YOUR_AUTH_URL" class="gerege-signin-btn gerege-signin-btn--branded">
  <img src="https://sso.gerege.mn/assets/brand/gerege-icon-dark.svg" alt="">
  <span>Sign in with Gerege</span>
</a>`}
          </code>

          <h2 className="text-gerege-primary mt-8">Response Payload</h2>
          <p className="text-white/85">
            Амжилттай нэвтрэлтийн дараа дараах мэдээллийг авах боломжтой:
          </p>

          <code className="block bg-black/30 p-4 rounded-lg text-sm overflow-x-auto">
            {`{
  "gen_id": "12345678901",      // Unique 11-digit identifier
  "email": "user@example.com",
  "verified": true,             // Identity verification status
  "gerege": {
    "family_name": "Батбаяр",
    "last_name": "Дорж",
    "first_name": "Болд",
    "birth_date": "1990-01-15",
    "gender": "male"
  }
}`}
          </code>

          <div className="mt-10 p-6 bg-orange-500/10 border border-orange-500/30 rounded-xl">
            <h3 className="text-orange-400 mb-2">⚠️ Анхааруулга</h3>
            <p className="text-white/70 text-sm">
              Регистрийн дугаар (reg_no) болон иргэний дугаар хэзээ ч гуравдагч
              талд дамжуулагдахгүй. Зөвхөн gen_id ашиглан хэрэглэгчийг таниарай.
            </p>
          </div>

          <div className="mt-6 p-6 bg-gerege-primary/10 border border-gerege-primary/30 rounded-xl">
            <h3 className="text-gerege-primary mb-2">Тусламж хэрэгтэй юу?</h3>
            <p className="text-white/70 text-sm">
              Интеграцитай холбоотой асуулт байвал:{' '}
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
      </main>
    </div>
  )
}
