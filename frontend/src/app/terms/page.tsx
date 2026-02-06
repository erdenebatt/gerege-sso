'use client'

import { Header } from '@/components/layout'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 md:p-10">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 pb-5 border-b border-slate-200 dark:border-slate-700">
            Үйлчилгээний нөхцөл
          </h1>

          <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-xl p-4 mb-8">
            <p className="text-slate-700 dark:text-slate-300">
              Gerege SSO үйлчилгээг ашигласнаар та эдгээр нөхцөлийг зөвшөөрсөнд
              тооцогдоно.
            </p>
          </div>

          <div className="space-y-8 text-slate-600 dark:text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                1. Үйлчилгээний тодорхойлолт
              </h2>
              <p>
                Gerege SSO нь нэгдсэн нэвтрэлт танилтын (Single Sign-On) систем
                юм. Энэхүү үйлчилгээ нь хэрэглэгчдэд Google бүртгэлээрээ нэвтрэх,
                иргэний мэдээллээр баталгаажуулах боломжийг олгоно.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                2. Хэрэглэгчийн үүрэг
              </h2>
              <p className="mb-3">Хэрэглэгч та дараах үүргийг хүлээнэ:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-500 dark:text-slate-400">
                <li>Өөрийн бүртгэлийн аюулгүй байдлыг хангах</li>
                <li>Үнэн зөв мэдээлэл оруулах</li>
                <li>Үйлчилгээг хууль бус зорилгоор ашиглахгүй байх</li>
                <li>Бусдын бүртгэлийг зөвшөөрөлгүй ашиглахгүй байх</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                3. Бүртгэл үүсгэх
              </h2>
              <p>
                Үйлчилгээг ашиглахын тулд та Google бүртгэлээрээ нэвтрэх
                шаардлагатай. Нэвтрэх үед бид таны имэйл хаяг, нэр, профайл зургийг
                хүлээн авна.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                4. Иргэний баталгаажуулалт
              </h2>
              <p>
                Та сайн дураараа регистрийн дугаараар баталгаажуулалт хийж болно.
                Баталгаажуулалт нь таны үйлчилгээний хүрээг өргөжүүлэх зорилготой.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                5. Үйлчилгээний хязгаарлалт
              </h2>
              <p className="mb-3">
                Бид дараах тохиолдолд үйлчилгээг хязгаарлах эрхтэй:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-500 dark:text-slate-400">
                <li>Үйлчилгээний нөхцөлийг зөрчсөн тохиолдолд</li>
                <li>Хууль бус үйлдэл илэрсэн тохиолдолд</li>
                <li>Системийн аюулгүй байдалд аюул учирсан тохиолдолд</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                6. Хариуцлагын хязгаарлалт
              </h2>
              <p>
                Gerege SSO нь &quot;байгаа чигээрээ&quot; үйлчилгээ үзүүлдаг. Бид
                үйлчилгээний тасралтгүй, алдаагүй ажиллагааг баталгаажуулахгүй.
                Техникийн саатлаас үүдсэн хохирлын хариуцлага хүлээхгүй.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                7. Оюуны өмч
              </h2>
              <p>
                Gerege SSO үйлчилгээний бүх лого, дизайн, кодын эх сурвалж нь
                зохиогчийн эрхээр хамгаалагдсан бөгөөд зөвшөөрөлгүй хуулбарлах,
                түгээхийг хориглоно.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                8. Нөхцөлийн өөрчлөлт
              </h2>
              <p>
                Бид эдгээр нөхцөлийг хүссэн үедээ өөрчлөх эрхтэй. Өөрчлөлт оруулсан
                тохиолдолд хэрэглэгчдэд мэдэгдэнэ. Өөрчлөлтийн дараа үйлчилгээг
                үргэлжлүүлэн ашигласнаар та шинэ нөхцөлийг зөвшөөрсөнд тооцогдоно.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                9. Хууль зүй
              </h2>
              <p>
                Эдгээр нөхцөл нь Монгол Улсын хууль тогтоомжийн дагуу зохицуулагдана.
                Маргаан гарсан тохиолдолд Монгол Улсын шүүхээр шийдвэрлүүлнэ.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                10. Холбоо барих
              </h2>
              <p>
                Үйлчилгээний нөхцөлтэй холбоотой асуулт байвал:{' '}
                <a
                  href="mailto:support@gerege.mn"
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
                >
                  support@gerege.mn
                </a>
              </p>
            </section>

            <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500">
              Сүүлд шинэчилсэн: 2024 оны 1-р сарын 1
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
