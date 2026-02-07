# Gerege SSO - Сайжруулах Төлөвлөгөө (Improvement Plan)

Энэхүү баримт бичиг нь Gerege SSO төслийн одоогийн байдалд хийсэн дүгнэлт болон цаашид хэрэгжүүлэх сайжруулалтын төлөвлөгөөг агуулна.

## 1. Төслийн Одоогийн Байдал (Assessment)

### Backend (Golang)
*   **Бүтэц:** Handler, Service, Model гэсэн давхаргын зөв бүтэцтэй.
*   **Өгөгдлийн сан:** Raw SQL ашиглаж байна. Энэ нь хурдны хувьд сайн боловч, `sql.DB`-г шууд Service дотор ашиглаж байгаа нь Unit Test бичихэд хүндрэлтэй (Mock хийхэд хэцүү).
*   **Authentication:** OAuth (Google, Apple, FB, Twitter) болон JWT, DAN системтэй холбогдсон логикууд сайн бичигдсэн.
*   **Testing:** Unit test байвал зохистой хэмжээнд харагдаж байна (`user_test.go`), гэхдээ CI/CD хоолой байхгүй.

### Frontend (Next.js)
*   **Технологи:** Next.js 14, TypeScript, Tailwind CSS, Zustand ашигласан нь орчин үеийн зөв сонголт.
*   **Бүтэц:** Component-уудыг `src` дотор зохион байгуулсан. `glass` effect болон dark mode дэмжлэгтэй.
*   **Testing:** Vitest тохируулсан байна.

## 2. Сайжруулах Төлөвлөгөө (Roadmap)

### I. Архитектур ба Код (Architecture & Code Quality)

#### Backend
1.  **Repository Pattern нэвтрүүлэх:**
    *   `UserService` дотор `*sql.DB`-г шууд ашиглахын оронд `UserRepository` интерфейс үүсгэх.
    *   Энэ нь Business Logic-ийг Database-ээс тусгаарлаж, Test хийхэд хялбар болгоно.
2.  **Linter тохируулах:**
    *   `golangci-lint` тохируулж, кодын чанарыг автоматаар шалгах.
    *   `gosec` ашиглан аюулгүй байдлын цоорхойг шалгах.
3.  **API Documentation:**
    *   Swagger/OpenAPI (жишээ нь `swaggo/swag`) ашиглан API документацийг автоматаар үүсгэх. Frontend хөгжүүлэгчдэд маш хэрэгтэй.

#### Frontend
1.  **Pre-commit Hooks:**
    *   `husky` болон `lint-staged` ашиглан код commit хийхээс өмнө auto-format, lint шалгах.
2.  **Shared Types:**
    *   Backend болон Frontend хооронд TypeScript type-уудыг (User model, API responses) нэгтгэх эсвэл `openapi-typescript` ашиглан Swagger-аас generate хийх.

### II. DevOps & CI/CD (Автоматжуулалт)

1.  **GitHub Actions:**
    *   Төсөлд `.github/workflows` байхгүй байна.
    *   **CI Pipeline:** Pull Request бүрт Build, Test, Lint ажиллуулах.
    *   **CD Pipeline:** Main branch руу ороход Docker image үүсгэж, Cloud Run руу deploy хийх (хэрэв шаардлагатай бол).
2.  **Docker Optimization:**
    *   Backend Dockerfile дээр Multi-stage build ашиглаж image-ийн хэмжээг багасгах.
    *   Frontend Dockerfile дээр `standalone` output ашиглан хэмжээг багасгах.

### III. Тестийн Стратеги (Testing Strategy)

1.  **Backend Integration Tests:**
    *   Docker Compose ашиглан түр зуурын (ephemeral) Postgres болон Redis асааж, бодит өгөгдлийн сантай тестлэх (`testcontainers-go` ашиглах).
2.  **E2E Testing (Frontend):**
    *   Playwright эсвэл Cypress нэвтрүүлж, Login, Sign Up, Profile Update зэрэг чухал user flow-уудыг хэрэглэгчийн нүдээр тестлэх.

### IV. Аюулгүй байдал (Security)

1.  **Security Headers:** Middleware дээр Helmet (Frontend) болон Secure Headers (Backend) нэмэх.
2.  **Rate Limiting:** Одоогоор Redis ашиглаж байгаа ч, Login endpoint-ууд дээр brute-force халдлагаас сэргийлэх нарийн тохиргоог шалгах.
3.  **DLP & Audit:** Audit log бичиж байгаа нь сайн (audit_logs table). Гэхдээ `Log4Shell` зэрэг эмзэг байдлаас сэргийлж dependency audit тогтмол хийх.

## 3. Хэрэгжүүлэх Дараалал (Priority)

1.  **Нэн тэргүүнд (High Priority):**
    *   GitHub Actions (CI/CD) тохируулах.
    *   `golangci-lint` болон Pre-commit hooks.
2.  **Дунд хугацаанд (Medium Priority):**
    *   Repository Pattern руу шилжих (Refactoring).
    *   API Documentation (Swagger).
3.  **Урт хугацаанд (Long Priority):**
    *   E2E Testing.
    *   Advanced Monitoring (Tracing).
