# Gerege SSO — Гуравдагч талын апп холболтын гарын авлага

## Тойм

Gerege SSO нь OAuth 2.0 зөвшөөрлийн сервер бөгөөд гуравдагч талын аппликейшнүүдэд хэрэглэгчдийг Gerege бүртгэлээр нь нэвтрүүлэх боломж олгодог. Энэ баримт бичигт таны аппликейшнийг Gerege SSO-тэй холбох бүрэн гарын авлагыг багтаасан болно.

**Суурь URL:** `https://sso.gerege.mn`

---

## Агуулга

1. [Хэрхэн ажилладаг вэ](#хэрхэн-ажилладаг-вэ)
2. [Урьдчилсан нөхцөл](#урьдчилсан-нөхцөл)
3. [Алхам 1: Аппликейшнээ бүртгүүлэх](#алхам-1-аппликейшнээ-бүртгүүлэх)
4. [Алхам 2: Хэрэглэгчийг зөвшөөрөл рүү чиглүүлэх](#алхам-2-хэрэглэгчийг-зөвшөөрөл-рүү-чиглүүлэх)
5. [Алхам 3: Callback боловсруулах](#алхам-3-callback-боловсруулах)
6. [Алхам 4: Кодыг Access Token-оор солих](#алхам-4-кодыг-access-token-оор-солих)
7. [Алхам 5: Access Token ашиглах](#алхам-5-access-token-ашиглах)
8. [PKCE дэмжлэг (Мобайл / SPA)](#pkce-дэмжлэг-мобайл--spa)
9. [Token-ий бүтэц](#token-ий-бүтэц)
10. [Хамрах хүрээ (Scopes)](#хамрах-хүрээ-scopes)
11. [Баталгаажуулалтын түвшин](#баталгаажуулалтын-түвшин)
12. [Хэрэглэгчийн зөвшөөрлийн удирдлага](#хэрэглэгчийн-зөвшөөрлийн-удирдлага)
13. [Аюулгүй байдлын зөвлөмж](#аюулгүй-байдлын-зөвлөмж)
14. [Алдааны боловсруулалт](#алдааны-боловсруулалт)
15. [Бүрэн жишээнүүд](#бүрэн-жишээнүүд)

---

## Хэрхэн ажилладаг вэ

Gerege SSO нь **OAuth 2.0 Authorization Code Flow** хэрэгжүүлдэг. Ерөнхий дараалал:

```
┌──────────┐     ┌──────────────┐     ┌────────────┐
│ Таны апп │     │  Gerege SSO  │     │ Хэрэглэгч- │
│ (Client) │     │   Сервер     │     │ ийн Browser │
└────┬─────┘     └──────┬───────┘     └─────┬──────┘
     │                  │                    │
     │  1. /api/oauth/authorize руу          │
     │     чиглүүлэх                         │
     │ ─────────────────────────────────────>│
     │                  │                    │
     │                  │  2. Хэрэглэгч     │
     │                  │     нэвтэрнэ      │
     │                  │<───────────────────│
     │                  │                    │
     │                  │  3. Зөвшөөрлийн    │
     │                  │     дэлгэц         │
     │                  │───────────────────>│
     │                  │                    │
     │                  │  4. Хэрэглэгч     │
     │                  │     зөвшөөрнө     │
     │                  │<───────────────────│
     │                  │                    │
     │  5. Authorization code-тэй           │
     │     callback руу чиглүүлэх            │
     │<──────────────────────────────────────│
     │                  │                    │
     │  6. POST /api/oauth/token             │
     │     (кодыг token-оор солих)           │
     │ ────────────────>│                    │
     │                  │                    │
     │  7. Access token буцаана              │
     │<─────────────────│                    │
     │                  │                    │
     │  8. Token ашиглан хэрэглэгчийг       │
     │     таних                             │
     │                  │                    │
```

---

## Урьдчилсан нөхцөл

Холболт хийхээс өмнө танд дараах зүйлс хэрэгтэй:

- Бүртгэгдсэн OAuth client (Gerege SSO админаас авна)
- HTTP хүсэлт илгээх чадвартай backend сервер (token солилцооны хувьд)
- Production орчинд HTTPS идэвхжүүлсэн redirect URI

---

## Алхам 1: Аппликейшнээ бүртгүүлэх

Gerege SSO админтай холбогдож аппликейшнээ бүртгүүлнэ. Дараах мэдээллийг өгөх шаардлагатай:

| Талбар | Тайлбар | Жишээ |
|--------|---------|-------|
| `name` | Аппликейшний нэр | `"Миний апп"` |
| `redirect_uris` | Зөвшөөрлийн дараа хэрэглэгчийг буцаах URL | `["https://myapp.mn/callback"]` |
| `scopes` | Хүсэж буй өгөгдлийн хамрах хүрээ | `["openid", "profile"]` |

Бүртгүүлсний дараа танд дараах зүйлс олгогдоно:

| Мэдээлэл | Тайлбар |
|-----------|---------|
| `client_id` | 64 тэмдэгтийн нийтийн танигч (public identifier) |
| `client_secret` | 64 тэмдэгтийн нууц түлхүүр (зөвхөн нэг удаа харуулна — аюулгүй хадгалаарай!) |

> **Анхааруулга:** `client_secret` нь зөвхөн үүсгэх үед харагдана. Хэрэв алдвал шинэ client бүртгүүлэх шаардлагатай.

### Admin API (зөвхөн SSO админуудад)

```bash
# Шинэ client бүртгэх
curl -X POST https://sso.gerege.mn/api/admin/clients \
  -H "X-API-Key: <ADMIN_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Миний апп",
    "redirect_uris": ["https://myapp.mn/callback"],
    "scopes": ["openid", "profile"]
  }'

# Хариу
{
  "client_id": "a1b2c3d4e5f6...64тэмдэгт",
  "client_secret": "x9y8z7w6v5u4...64тэмдэгт"
}
```

---

## Алхам 2: Хэрэглэгчийг зөвшөөрөл рүү чиглүүлэх

Хэрэглэгч таны апп дээр "Gerege-ээр нэвтрэх" товчийг дарахад тэднийг дараах хаяг руу чиглүүлнэ:

```
GET https://sso.gerege.mn/api/oauth/authorize
```

### Заавал шаардлагатай параметрүүд

| Параметр | Төрөл | Тайлбар |
|----------|-------|---------|
| `client_id` | string | Бүртгэгдсэн client ID |
| `redirect_uri` | string | Бүртгэгдсэн URI-уудын аль нэгтэй яг таарах ёстой |
| `response_type` | string | `"code"` байх ёстой |
| `scope` | string | Зайгаар тусгаарласан хамрах хүрээ (жнь: `"openid profile"`) |
| `state` | string | CSRF хамгаалалтын санамсаргүй тэмдэгт мөр (та үүсгэнэ) |

### Нэмэлт параметрүүд (PKCE)

| Параметр | Төрөл | Тайлбар |
|----------|-------|---------|
| `code_challenge` | string | code_verifier-ийн SHA256 hash, Base64url кодлогдсон |
| `code_challenge_method` | string | `"S256"` (санал болгох) эсвэл `"plain"` |

### Жишээ URL

```
https://sso.gerege.mn/api/oauth/authorize?
  client_id=a1b2c3d4e5f6...&
  redirect_uri=https://myapp.mn/callback&
  response_type=code&
  scope=openid%20profile&
  state=random_csrf_token_abc123
```

### Дараа нь юу болох вэ

1. Хэрэглэгч **нэвтрээгүй** бол → Gerege SSO нэвтрэх хуудас руу чиглүүлэгдэнэ (Google, Apple, Facebook, Twitter-ээр нэвтрэх боломжтой)
2. Хэрэглэгч **нэвтэрсэн боловч таны аппыг зөвшөөрөөгүй** бол → таны апп ямар өгөгдөлд хандахыг хүсч байгааг харуулсан зөвшөөрлийн дэлгэц гарна
3. Хэрэглэгч **аль хэдийн зөвшөөрсөн** бол → authorization code-тэй шууд таны апп руу чиглүүлэгдэнэ

---

## Алхам 3: Callback боловсруулах

Хэрэглэгч таны аппыг зөвшөөрсөн (эсвэл татгалзсан) дараа Gerege SSO тэдний browser-ийг таны `redirect_uri` руу чиглүүлнэ:

### Амжилттай зөвшөөрөл

```
https://myapp.mn/callback?code=AUTH_CODE_HERE&state=random_csrf_token_abc123
```

| Параметр | Тайлбар |
|----------|---------|
| `code` | Authorization код (нэг удаагийн, 5 минутын дотор дуусна) |
| `state` | Таны илгээсэн state утга — **таарч байгаа эсэхийг заавал шалгаарай!** |

### Татгалзсан эсвэл алдаа

```
https://myapp.mn/callback?error=access_denied&state=random_csrf_token_abc123
```

### Таны callback handler дараах зүйлийг хийх ёстой:

1. `state` параметр нь хэрэглэгчийн session-д хадгалсан утгатай **таарч** байгааг шалгах
2. `code` параметрийг **авах**
3. Кодыг access token-оор **солих** (дараагийн алхам)

---

## Алхам 4: Кодыг Access Token-оор солих

Authorization кодыг access token-оор солихын тулд сервер-сервер POST хүсэлт илгээнэ:

```
POST https://sso.gerege.mn/api/oauth/token
Content-Type: application/x-www-form-urlencoded
```

### Хүсэлтийн параметрүүд

| Параметр | Төрөл | Заавал эсэх | Тайлбар |
|----------|-------|-------------|---------|
| `grant_type` | string | Тийм | `"authorization_code"` байх ёстой |
| `code` | string | Тийм | Callback-аас ирсэн authorization код |
| `redirect_uri` | string | Тийм | Алхам 2-т ашигласан URI-тай таарах ёстой |
| `client_id` | string | Тийм | Таны client ID |
| `client_secret` | string | Тийм | Таны client secret |
| `code_verifier` | string | PKCE бол | Анхны code_verifier (PKCE ашигласан бол) |

### Жишээ хүсэлт

```bash
curl -X POST https://sso.gerege.mn/api/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=AUTH_CODE_HERE" \
  -d "redirect_uri=https://myapp.mn/callback" \
  -d "client_id=a1b2c3d4e5f6..." \
  -d "client_secret=x9y8z7w6v5u4..."
```

### Амжилттай хариу

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

> **Чухал:** Authorization код нь **нэг удаагийн** хэрэглээтэй. Солилцоо амжилтгүй болвол хэрэглэгч дахин зөвшөөрөл өгөх шаардлагатай.

---

## Алхам 5: Access Token ашиглах

`access_token` нь хэрэглэгчийн мэдээллийг агуулсан JWT юм. Үүнийг decode хийж хэрэглэгчийн өгөгдлийг гаргаж авч болно.

### Token-ийг decode хийх

Token нь HS256-аар гарын үсэг зурагдсан. JWT payload-ыг decode хийж хэрэглэгчийн claim-уудад хандана:

```javascript
// Жишээ: JWT payload decode хийх (Node.js)
const token = "eyJhbGciOiJIUzI1NiIs...";
const payload = JSON.parse(
  Buffer.from(token.split('.')[1], 'base64').toString()
);

console.log(payload);
// {
//   "sub": "11234567890",
//   "email": "user@example.com",
//   "picture": "https://lh3.googleusercontent.com/...",
//   "email_verified": true,
//   "gerege": {
//     "gen_id": "11234567890",
//     "first_name": "Бат",
//     "last_name": "Дорж",
//     "family_name": "Борж",
//     "birth_date": "1995-03-15",
//     "gender": "1",
//     "verification_level": 3
//   },
//   "aud": "a1b2c3d4e5f6...",
//   "iss": "https://sso.gerege.mn",
//   "exp": 1700000000
// }
```

### Хэрэглэгчийн гол талбарууд

| Claim | Төрөл | Тайлбар |
|-------|-------|---------|
| `sub` | string | Давтагдашгүй Gerege ID (11 оронтой) — хэрэглэгчийн танигч болгон ашиглана |
| `email` | string | Хэрэглэгчийн имэйл хаяг |
| `picture` | string | Профайл зургийн URL |
| `email_verified` | boolean | Имэйл баталгаажсан эсэх |
| `gerege.gen_id` | string | `sub`-тай ижил — Gerege ID |
| `gerege.first_name` | string | Хэрэглэгчийн нэр |
| `gerege.last_name` | string | Хэрэглэгчийн овог |
| `gerege.family_name` | string | Хэрэглэгчийн ургийн овог |
| `gerege.birth_date` | string | Төрсөн огноо (`YYYY-MM-DD`) |
| `gerege.gender` | string | `"1"` = Эрэгтэй, `"2"` = Эмэгтэй |
| `gerege.verification_level` | integer | Баталгаажуулалтын түвшин (1–4) |
| `aud` | string | Таны `client_id` — таны апптай таарч байгааг шалгаарай |
| `iss` | string | Олгогч — `"https://sso.gerege.mn"` байх ёстой |
| `exp` | integer | Token-ий дуусах хугацаа (Unix timestamp) |

> **Нууцлал:** `reg_no` (регистрийн дугаар) болон `civil_id` нь гуравдагч талын token-д **хэзээ ч** орохгүй. Эдгээр мэдрэмтгий талбарууд зөвхөн Gerege SSO системийн дотор ашиглагдана.

---

## PKCE дэмжлэг (Мобайл / SPA)

`client_secret`-ийг аюулгүй хадгалах боломжгүй мобайл апп болон SPA (Single Page Application)-д зориулж Gerege SSO нь **PKCE (Proof Key for Code Exchange)** дэмждэг.

### PKCE хэрхэн ажилладаг

1. **`code_verifier` үүсгэх** — санамсаргүй тэмдэгт мөр (43–128 тэмдэгт)
2. **`code_challenge` гаргах** — verifier-ийн SHA256 hash, base64url кодлогдсон
3. **`code_challenge`-ийг** зөвшөөрлийн хүсэлтэд илгээх
4. **`code_verifier`-ийг** token солилцооны хүсэлтэд илгээх
5. Сервер SHA256(verifier) нь challenge-тай таарч байгааг шалгана

### Жишээ хэрэгжүүлэлт

```javascript
// 1. code_verifier үүсгэх
const crypto = require('crypto');
const codeVerifier = crypto.randomBytes(32).toString('base64url');

// 2. code_challenge гаргах
const codeChallenge = crypto
  .createHash('sha256')
  .update(codeVerifier)
  .digest('base64url');

// 3. PKCE-тэй зөвшөөрлийн URL
const authUrl = `https://sso.gerege.mn/api/oauth/authorize?` +
  `client_id=${CLIENT_ID}&` +
  `redirect_uri=${REDIRECT_URI}&` +
  `response_type=code&` +
  `scope=openid%20profile&` +
  `state=${state}&` +
  `code_challenge=${codeChallenge}&` +
  `code_challenge_method=S256`;

// 4. code_verifier-тэй token солилцоо
const tokenResponse = await fetch('https://sso.gerege.mn/api/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authCode,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code_verifier: codeVerifier,
  }),
});
```

---

## Token-ий бүтэц

### Гуравдагч талын Access Token (1 цагийн хүчинтэй хугацаа)

```json
{
  "sub": "11234567890",
  "email": "user@example.com",
  "picture": "https://lh3.googleusercontent.com/a/photo.jpg",
  "email_verified": true,
  "gerege": {
    "gen_id": "11234567890",
    "first_name": "Бат",
    "last_name": "Дорж",
    "family_name": "Борж",
    "birth_date": "1995-03-15",
    "gender": "1",
    "verification_level": 3
  },
  "aud": "your_client_id",
  "iss": "https://sso.gerege.mn",
  "jti": "unique-token-id",
  "iat": 1700000000,
  "exp": 1700003600
}
```

### Token-ий чухал мэдээлэл

| Шинж чанар | Утга |
|------------|------|
| Алгоритм | HS256 (HMAC-SHA256) |
| Хүчинтэй хугацаа | 1 цаг (3600 секунд) |
| Олгогч (Issuer) | `https://sso.gerege.mn` |
| Хүлээн авагч (Audience) | Таны `client_id` |

### Token шалгах жагсаалт

Таны сервер token хүлээж авахдаа дараахыг шалгана:

1. **Гарын үсэг** — HS256 гарын үсгийг баталгаажуулах (хуваалцсан JWT secret шаардлагатай)
2. **Хүчинтэй хугацаа** — `exp` > одоогийн цаг эсэхийг шалгах
3. **Олгогч** — `iss` == `"https://sso.gerege.mn"` эсэхийг шалгах
4. **Хүлээн авагч** — `aud` == таны `client_id` эсэхийг шалгах

---

## Хамрах хүрээ (Scopes)

| Хамрах хүрээ | Тайлбар | Агуулагдах өгөгдөл |
|-------------|---------|---------------------|
| `openid` | Үндсэн таниулалт | `sub` (Gerege ID), `iss`, `aud` |
| `profile` | Хэрэглэгчийн профайл | `first_name`, `last_name`, `family_name`, `birth_date`, `gender`, `picture` |
| `email` | Имэйл хаяг | `email`, `email_verified` |

Хамрах хүрээ заагаагүй бол анхдагч утга: `openid`, `profile`.

---

## Баталгаажуулалтын түвшин

Хэрэглэгч бүр өөрийн биеийн байцаалт хэр баталгаажсаныг илэрхийлэх `verification_level` утгатай:

| Түвшин | Нэр | Тайлбар | Итгэлцлийн түвшин |
|--------|-----|---------|-------------------|
| 1 | Имэйл баталгаажсан | OAuth нийлүүлэгчээр (Google, Apple г.м.) нэвтэрсэн | Суурь |
| 2 | Утас баталгаажсан | Утасны дугаараа OTP-ээр баталгаажуулсан | Дунд |
| 3 | Регистр баталгаажсан | Регистрийн дугаар иргэний бүртгэлтэй таарсан | Өндөр |
| 4 | ДАН баталгаажсан | Монголын Дижитал ID (ДАН) системээр баталгаажсан | Хамгийн өндөр |

### Баталгаажуулалтын түвшин ашиглах

Та `verification_level` claim-ийг ашиглан аппдаа хандалтын хяналт хийж болно:

```javascript
const payload = decodeJWT(accessToken);
const level = payload.gerege.verification_level;

if (level < 3) {
  // Мэдрэмтгий үйлдлүүдэд өндөр баталгаажуулалт шаардах
  return res.status(403).json({
    error: "Биеийн байцаалт шаардлагатай",
    message: "Энэ боломжийг ашиглахын өмнө sso.gerege.mn дээр биеийн байцаалтаа баталгаажуулна уу",
    required_level: 3,
    current_level: level
  });
}
```

---

## Хэрэглэгчийн зөвшөөрлийн удирдлага

Хэрэглэгчид Gerege SSO хяналтын самбараас гуравдагч талын апп-уудад олгосон хандалтаа харж, цуцлах боломжтой.

### Хэрэглэгч хандалтыг цуцлахад юу болох

- `user_grants` хүснэгтийн бичлэг цуцлагдсан гэж тэмдэглэгдэнэ
- Таны апп дараагийн нэвтрэлтийн оролдлого дээр хэрэглэгчийг дахин зөвшөөрөл авах шаардлагатай болно
- Одоо байгаа token-ууд хүчинтэй хугацаа дуустал (хамгийн ихдээ 1 цаг) хүчинтэй хэвээр үлдэнэ

### Дахин зөвшөөрлийн урсгал

Хэрэглэгч таны аппын хандалтыг цуцалсны дараа дахин нэвтрэх оролдлого хийвэл:

1. Хэрэглэгч зөвшөөрлийн дэлгэц рүү чиглүүлэгдэнэ
2. Хэрэглэгч таны аппыг дахин зөвшөөрөх ёстой
3. Шинэ зөвшөөрөл үүснэ
4. Хэвийн урсгал үргэлжлэнэ

---

## Аюулгүй байдлын зөвлөмж

### Заавал хийх

- **`client_secret`-ийг аюулгүй хадгалах** — frontend код, мобайл апп, нийтийн репозитори-д хэзээ ч ил гаргахгүй
- **`state` параметрийг заавал шалгах** — CSRF халдлагаас хамгаална
- **HTTPS ашиглах** — production орчинд бүх redirect URI-д
- **Token claim-уудыг шалгах** — өгөгдөлд итгэхээс өмнө `iss`, `aud`, `exp` шалгах
- **PKCE ашиглах** — мобайл болон SPA аппликейшнүүдэд

### Зөвлөмж

- **`sub` (gen_id)-ийг хэрэглэгчийн танигч болгон ашиглах** — систем даяар тогтвортой, давтагдашгүй
- **Token-ий хүчинтэй хугацааг зөв боловсруулах** — token дуусахад хэрэглэгчийг дахин зөвшөөрөл авахаар чиглүүлэх
- **Зөвшөөрлийн үйл явдлуудыг бүртгэх** — хэрэглэгчид хэзээ зөвшөөрч/цуцалж байгааг хянах
- **Хамгийн бага хамрах хүрээ хүсэх** — зөвхөн таны аппд шаардлагатай өгөгдлийг хүсэх

### Хэзээ ч хийж болохгүй

- Client-side код дээр **`client_secret`-ийг хэзээ ч ил гаргахгүй**
- Token-ийг **localStorage-д хэзээ ч хадгалахгүй** — httpOnly cookie эсвэл серверийн аюулгүй хадгалалт ашиглах
- **`state` шалгалтыг хэзээ ч алгасахгүй** — энэ бол таны CSRF хамгаалалт
- **`reg_no` эсвэл `civil_id` token-д байна гэж хэзээ ч бүү тооцоол** — эдгээр гуравдагч талтай хэзээ ч хуваалцахгүй

---

## Алдааны боловсруулалт

### Зөвшөөрлийн алдаанууд

| Алдаа | Тайлбар | Үйлдэл |
|-------|---------|---------|
| `invalid_client` | Client ID олдоогүй эсвэл идэвхгүй | `client_id`-аа шалгана уу |
| `invalid_redirect_uri` | Redirect URI бүртгэгдсэн URI-уудтай таарахгүй | Бүртгэгдсэн URI-уудаа шалгана уу |
| `invalid_response_type` | Зөвхөн `"code"` дэмжигддэг | `response_type=code` ашиглана уу |
| `access_denied` | Хэрэглэгч зөвшөөрлийн хүсэлтийг татгалзсан | Хэрэглэгчид тохирох мессеж харуулна уу |

### Token солилцооны алдаанууд

| Алдаа | Тайлбар | Үйлдэл |
|-------|---------|---------|
| `invalid_grant` | Auth код хугацаа дууссан, ашиглагдсан, эсвэл буруу | Зөвшөөрлийн урсгалыг дахин эхлүүлнэ үү |
| `invalid_client` | Client баталгаажуулалт амжилтгүй | `client_id` болон `client_secret`-ийг шалгана уу |
| `invalid_request` | Заавал шаардлагатай параметрүүд дутуу | Бүх шаардлагатай талбаруудыг шалгана уу |
| `invalid_pkce` | PKCE баталгаажуулалт амжилтгүй | `code_verifier` нь `code_challenge`-тай таарч байгааг шалгана уу |

### HTTP статус кодууд

| Код | Утга |
|-----|------|
| 200 | Амжилттай |
| 302 | Чиглүүлэлт (зөвшөөрлийн урсгал) |
| 400 | Буруу хүсэлт (параметрүүд буруу) |
| 401 | Зөвшөөрөлгүй (мэдээлэл буруу) |
| 404 | Client олдсонгүй |
| 500 | Серверийн алдаа |

---

## Бүрэн жишээнүүд

### Node.js / Express

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

const CLIENT_ID = process.env.GEREGE_CLIENT_ID;
const CLIENT_SECRET = process.env.GEREGE_CLIENT_SECRET;
const REDIRECT_URI = 'https://myapp.mn/callback';
const SSO_BASE = 'https://sso.gerege.mn';

// State-үүдийг session-д хадгалах (production-д Redis ашиглана)
const states = new Map();

// Алхам 1: Хэрэглэгчийг Gerege SSO руу чиглүүлэх
app.get('/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  states.set(state, true);

  const authUrl = `${SSO_BASE}/api/oauth/authorize?` +
    `client_id=${CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `response_type=code&` +
    `scope=openid%20profile%20email&` +
    `state=${state}`;

  res.redirect(authUrl);
});

// Алхам 2: Callback боловсруулах
app.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  // State шалгах
  if (!states.has(state)) {
    return res.status(403).send('State буруу — CSRF халдлага байж магадгүй');
  }
  states.delete(state);

  // Алдаа шалгах
  if (error) {
    return res.status(400).send(`Зөвшөөрөл амжилтгүй: ${error}`);
  }

  // Алхам 3: Кодыг token-оор солих
  const tokenRes = await fetch(`${SSO_BASE}/api/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.json();
    return res.status(400).json({ error: 'Token солилцоо амжилтгүй', details: err });
  }

  const { access_token } = await tokenRes.json();

  // Алхам 4: Token-оос хэрэглэгчийн мэдээлэл гаргах
  const payload = JSON.parse(
    Buffer.from(access_token.split('.')[1], 'base64').toString()
  );

  // payload.sub (gen_id)-ийг давтагдашгүй хэрэглэгчийн танигч болгон ашиглах
  const user = {
    geregeId: payload.sub,
    email: payload.email,
    firstName: payload.gerege.first_name,
    lastName: payload.gerege.last_name,
    verificationLevel: payload.gerege.verification_level,
  };

  // Session үүсгэх, хэрэглэгчийг хадгалах, dashboard руу чиглүүлэх...
  req.session.user = user;
  res.redirect('/dashboard');
});

app.listen(3000);
```

### Python / Flask

```python
import os
import secrets
import requests
import base64
import json
from flask import Flask, redirect, request, session, jsonify

app = Flask(__name__)
app.secret_key = os.environ['FLASK_SECRET']

CLIENT_ID = os.environ['GEREGE_CLIENT_ID']
CLIENT_SECRET = os.environ['GEREGE_CLIENT_SECRET']
REDIRECT_URI = 'https://myapp.mn/callback'
SSO_BASE = 'https://sso.gerege.mn'


@app.route('/login')
def login():
    state = secrets.token_hex(16)
    session['oauth_state'] = state

    auth_url = (
        f"{SSO_BASE}/api/oauth/authorize?"
        f"client_id={CLIENT_ID}&"
        f"redirect_uri={REDIRECT_URI}&"
        f"response_type=code&"
        f"scope=openid%20profile%20email&"
        f"state={state}"
    )
    return redirect(auth_url)


@app.route('/callback')
def callback():
    # State шалгах
    if request.args.get('state') != session.pop('oauth_state', None):
        return 'State буруу', 403

    error = request.args.get('error')
    if error:
        return f'Зөвшөөрөл амжилтгүй: {error}', 400

    code = request.args.get('code')

    # Кодыг token-оор солих
    token_res = requests.post(f'{SSO_BASE}/api/oauth/token', data={
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': REDIRECT_URI,
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
    })

    if not token_res.ok:
        return jsonify({'error': 'Token солилцоо амжилтгүй'}), 400

    access_token = token_res.json()['access_token']

    # JWT payload decode хийх
    payload_b64 = access_token.split('.')[1]
    payload_b64 += '=' * (4 - len(payload_b64) % 4)  # Base64 дүүргэх
    payload = json.loads(base64.b64decode(payload_b64))

    # Хэрэглэгчийг session-д хадгалах
    session['user'] = {
        'gerege_id': payload['sub'],
        'email': payload['email'],
        'first_name': payload['gerege']['first_name'],
        'last_name': payload['gerege']['last_name'],
        'verification_level': payload['gerege']['verification_level'],
    }

    return redirect('/dashboard')
```

### Go

```go
package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
)

var (
	clientID     = os.Getenv("GEREGE_CLIENT_ID")
	clientSecret = os.Getenv("GEREGE_CLIENT_SECRET")
	redirectURI  = "https://myapp.mn/callback"
	ssoBase      = "https://sso.gerege.mn"
)

// Production-д Redis эсвэл мэдээллийн сан ашиглан state хадгалах
var stateStore = map[string]bool{}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	b := make([]byte, 16)
	rand.Read(b)
	state := base64.URLEncoding.EncodeToString(b)
	stateStore[state] = true

	authURL := fmt.Sprintf(
		"%s/api/oauth/authorize?client_id=%s&redirect_uri=%s&response_type=code&scope=openid%%20profile%%20email&state=%s",
		ssoBase, clientID, url.QueryEscape(redirectURI), state,
	)
	http.Redirect(w, r, authURL, http.StatusFound)
}

func callbackHandler(w http.ResponseWriter, r *http.Request) {
	state := r.URL.Query().Get("state")
	if !stateStore[state] {
		http.Error(w, "State буруу", http.StatusForbidden)
		return
	}
	delete(stateStore, state)

	code := r.URL.Query().Get("code")

	// Кодыг token-оор солих
	resp, err := http.PostForm(ssoBase+"/api/oauth/token", url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {redirectURI},
		"client_id":     {clientID},
		"client_secret": {clientSecret},
	})
	if err != nil {
		http.Error(w, "Token солилцоо амжилтгүй", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	var tokenRes struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
		ExpiresIn   int    `json:"expires_in"`
	}
	json.NewDecoder(resp.Body).Decode(&tokenRes)

	// JWT payload decode хийх
	parts := strings.Split(tokenRes.AccessToken, ".")
	payload, _ := base64.RawURLEncoding.DecodeString(parts[1])

	var claims map[string]interface{}
	json.Unmarshal(payload, &claims)

	// claims["sub"]-ийг давтагдашгүй Gerege ID болгон ашиглах
	fmt.Fprintf(w, "Тавтай морил, Gerege ID: %s", claims["sub"])
}

func main() {
	http.HandleFunc("/login", loginHandler)
	http.HandleFunc("/callback", callbackHandler)
	http.ListenAndServe(":8080", nil)
}
```

---

## Шуурхай лавлагаа

### Endpoint-ууд

| Endpoint | Метод | Зорилго |
|----------|-------|---------|
| `/api/oauth/authorize` | GET | Зөвшөөрлийн урсгал эхлүүлэх |
| `/api/oauth/token` | POST | Кодыг access token-оор солих |

### Зөвшөөрлийн параметрүүд

```
GET /api/oauth/authorize?
  client_id=ТАНЫ_CLIENT_ID&
  redirect_uri=ТАНЫ_CALLBACK_URL&
  response_type=code&
  scope=openid profile email&
  state=САНАМСАРГҮЙ_ТЭМДЭГТ_МӨР
```

### Token солилцооны параметрүүд

```
POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTH_КОД&
redirect_uri=ТАНЫ_CALLBACK_URL&
client_id=ТАНЫ_CLIENT_ID&
client_secret=ТАНЫ_CLIENT_SECRET
```

### Token-ий хүчинтэй хугацаа

| Token төрөл | Хүчинтэй хугацаа |
|-------------|-------------------|
| Гуравдагч талын access token | 1 цаг |
| Authorization код | 5 минут (нэг удаагийн) |

---

## Холбоо барих

Асуулт байгаа бол эсвэл аппликейшнээ бүртгүүлэхийн тулд Gerege SSO багтай холбогдоно уу.
