'use client'

import { Header } from '@/components/layout'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 md:p-10">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 pb-5 border-b border-slate-200 dark:border-slate-700">
            Нууцлалын бодлого
          </h1>

          <div className="space-y-8 text-slate-600 dark:text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                1. Танилцуулга
              </h2>
              <p>
                Gerege SSO нь таны хувийн мэдээллийг хамгаалахад онцгой анхаарал
                хандуулдаг. Энэхүү Нууцлалын бодлого нь бидний үйлчилгээг ашиглах
                үед таны мэдээллийг хэрхэн цуглуулж, ашиглаж, хадгалж буйг
                тайлбарладаг.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                2. Цуглуулах мэдээлэл
              </h2>
              <p className="mb-3">Бид дараах мэдээллийг цуглуулдаг:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-500 dark:text-slate-400">
                <li>
                  <strong className="text-slate-700 dark:text-slate-300">Google бүртгэлийн мэдээлэл:</strong> Имэйл хаяг, нэр,
                  профайл зураг
                </li>
                <li>
                  <strong className="text-slate-700 dark:text-slate-300">Таних мэдээлэл:</strong> Регистрийн дугаар (сайн дурын)
                </li>
                <li>
                  <strong className="text-slate-700 dark:text-slate-300">Техникийн мэдээлэл:</strong> IP хаяг, хөтчийн төрөл,
                  нэвтрэлтийн цаг
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                3. Мэдээллийн ашиглалт
              </h2>
              <p className="mb-3">Таны мэдээллийг дараах зорилгоор ашигладаг:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-500 dark:text-slate-400">
                <li>Нэвтрэлтийн үйлчилгээ үзүүлэх</li>
                <li>Хэрэглэгчийн таниулалт хийх</li>
                <li>Системийн аюулгүй байдлыг хангах</li>
                <li>Үйлчилгээг сайжруулах</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                4. Мэдээллийн хадгалалт
              </h2>
              <p>
                Таны мэдээллийг аюулгүй серверт шифрлэгдсэн байдлаар хадгалдаг.
                Бид зөвхөн үйлчилгээ үзүүлэхэд шаардлагатай хугацаанд мэдээллийг
                хадгалдаг.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                5. Мэдээлэл дамжуулалт
              </h2>
              <p>
                Бид таны хувийн мэдээллийг гуравдагч этгээдэд зарахгүй, солилцохгүй,
                түрээслэхгүй. Хуулиар шаардсан тохиолдолд холбогдох байгууллагад
                мэдээлэл өгч болно.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                6. Таны эрх
              </h2>
              <p className="mb-3">Та дараах эрхтэй:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-500 dark:text-slate-400">
                <li>Өөрийн мэдээлэлд хандах</li>
                <li>Мэдээллээ засах</li>
                <li>Мэдээллээ устгуулах хүсэлт гаргах</li>
                <li>Мэдээллийн боловсруулалтаас татгалзах</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                7. Cookie
              </h2>
              <p>
                Бид үйлчилгээг сайжруулах зорилгоор cookies ашигладаг. Та
                хөтчийнхөө тохиргооноос cookies-г идэвхгүй болгож болно.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                8. Холбоо барих
              </h2>
              <p>
                Нууцлалын асуудлаар холбоо барихыг хүсвэл:{' '}
                <a
                  href="mailto:privacy@gerege.mn"
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
                >
                  privacy@gerege.mn
                </a>
              </p>
            </section>

            <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-500">
              Сүүлд шинэчилсэн: 2024 оны 1-р сарын 1
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
