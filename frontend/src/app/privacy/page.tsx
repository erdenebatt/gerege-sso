import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="max-w-[800px] mx-auto px-5 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gerege-primary text-sm mb-5 hover:underline"
      >
        ← Нүүр хуудас руу буцах
      </Link>

      <div className="glass rounded-2xl p-10">
        <h1 className="text-2xl font-bold mb-8 pb-5 border-b border-white/20">
          Нууцлалын бодлого
        </h1>

        <div className="space-y-8 text-white/85 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gerege-primary mb-4">
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
            <h2 className="text-xl font-semibold text-gerege-primary mb-4">
              2. Цуглуулах мэдээлэл
            </h2>
            <p className="mb-3">Бид дараах мэдээллийг цуглуулдаг:</p>
            <ul className="list-disc pl-8 space-y-2">
              <li>
                <strong>Google бүртгэлийн мэдээлэл:</strong> Имэйл хаяг, нэр,
                профайл зураг
              </li>
              <li>
                <strong>Таних мэдээлэл:</strong> Регистрийн дугаар (сайн дурын)
              </li>
              <li>
                <strong>Техникийн мэдээлэл:</strong> IP хаяг, хөтчийн төрөл,
                нэвтрэлтийн цаг
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gerege-primary mb-4">
              3. Мэдээллийн ашиглалт
            </h2>
            <p className="mb-3">Таны мэдээллийг дараах зорилгоор ашигладаг:</p>
            <ul className="list-disc pl-8 space-y-2">
              <li>Нэвтрэлтийн үйлчилгээ үзүүлэх</li>
              <li>Хэрэглэгчийн таниулалт хийх</li>
              <li>Системийн аюулгүй байдлыг хангах</li>
              <li>Үйлчилгээг сайжруулах</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gerege-primary mb-4">
              4. Мэдээллийн хадгалалт
            </h2>
            <p>
              Таны мэдээллийг аюулгүй серверт шифрлэгдсэн байдлаар хадгалдаг.
              Бид зөвхөн үйлчилгээ үзүүлэхэд шаардлагатай хугацаанд мэдээллийг
              хадгалдаг.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gerege-primary mb-4">
              5. Мэдээлэл дамжуулалт
            </h2>
            <p>
              Бид таны хувийн мэдээллийг гуравдагч этгээдэд зарахгүй, солилцохгүй,
              түрээслэхгүй. Хуулиар шаардсан тохиолдолд холбогдох байгууллагад
              мэдээлэл өгч болно.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gerege-primary mb-4">
              6. Таны эрх
            </h2>
            <p className="mb-3">Та дараах эрхтэй:</p>
            <ul className="list-disc pl-8 space-y-2">
              <li>Өөрийн мэдээлэлд хандах</li>
              <li>Мэдээллээ засах</li>
              <li>Мэдээллээ устгуулах хүсэлт гаргах</li>
              <li>Мэдээллийн боловсруулалтаас татгалзах</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gerege-primary mb-4">
              7. Cookie
            </h2>
            <p>
              Бид үйлчилгээг сайжруулах зорилгоор cookies ашигладаг. Та
              хөтчийнхөө тохиргооноос cookies-г идэвхгүй болгож болно.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gerege-primary mb-4">
              8. Холбоо барих
            </h2>
            <p>
              Нууцлалын асуудлаар холбоо барихыг хүсвэл:{' '}
              <a
                href="mailto:privacy@gerege.mn"
                className="text-gerege-primary hover:underline"
              >
                privacy@gerege.mn
              </a>
            </p>
          </section>

          <div className="pt-6 mt-6 border-t border-white/20 text-sm text-white/50">
            Сүүлд шинэчилсэн: 2024 оны 1-р сарын 1
          </div>
        </div>
      </div>
    </div>
  )
}
