import Link from 'next/link'

export default function TermsPage() {
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
          Үйлчилгээний нөхцөл
        </h1>

        <div className="bg-gerege-primary/10 border border-gerege-primary/30 rounded-lg p-4 mb-8">
          <p className="text-white/85">
            Gerege SSO үйлчилгээг ашигласнаар та эдгээр нөхцөлийг зөвшөөрсөнд
            тооцогдоно.
          </p>
        </div>

        <div className="space-y-8 text-white/85 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gerege-primary mb-4">
              1. Үйлчилгээний тодорхойлолт
            </h2>
            <p>
              Gerege SSO нь нэгдсэн нэвтрэлт танилтын (Single Sign-On) систем
              юм. Энэхүү үйлчилгээ нь хэрэглэгчдэд Google бүртгэлээрээ нэвтрэх,
              иргэний мэдээллээр баталгаажуулах боломжийг олгоно.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gerege-primary mb-4">
              2. Хэрэглэгчийн үүрэг
            </h2>
            <p className="mb-3">Хэрэглэгч та дараах үүргийг хүлээнэ:</p>
            <ul className="list-disc pl-8 space-y-2">
              <li>Өөрийн бүртгэлийн аюулгүй байдлыг хангах</li>
              <li>Үнэн зөв мэдээлэл оруулах</li>
              <li>Үйлчилгээг хууль бус зорилгоор ашиглахгүй байх</li>
              <li>Бусдын бүртгэлийг зөвшөөрөлгүй ашиглахгүй байх</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gerege-primary mb-4">
              3. Бүртгэл үүсгэх
            </h2>
            <p>
              Үйлчилгээг ашиглахын тулд та Google бүртгэлээрээ нэвтрэх
              шаардлагатай. Нэвтрэх үед бид таны имэйл хаяг, нэр, профайл зургийг
              хүлээн авна.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gerege-primary mb-4">
              4. Иргэний баталгаажуулалт
            </h2>
            <p>
              Та сайн дураараа регистрийн дугаараар баталгаажуулалт хийж болно.
              Баталгаажуулалт нь таны үйлчилгээний хүрээг өргөжүүлэх зорилготой.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gerege-primary mb-4">
              5. Үйлчилгээний хязгаарлалт
            </h2>
            <p className="mb-3">
              Бид дараах тохиолдолд үйлчилгээг хязгаарлах эрхтэй:
            </p>
            <ul className="list-disc pl-8 space-y-2">
              <li>Үйлчилгээний нөхцөлийг зөрчсөн тохиолдолд</li>
              <li>Хууль бус үйлдэл илэрсэн тохиолдолд</li>
              <li>Системийн аюулгүй байдалд аюул учирсан тохиолдолд</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gerege-primary mb-4">
              6. Хариуцлагын хязгаарлалт
            </h2>
            <p>
              Gerege SSO нь &quot;байгаа чигээрээ&quot; үйлчилгээ үзүүлдаг. Бид
              үйлчилгээний тасралтгүй, алдаагүй ажиллагааг баталгаажуулахгүй.
              Техникийн саатлаас үүдсэн хохирлын хариуцлага хүлээхгүй.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gerege-primary mb-4">
              7. Оюуны өмч
            </h2>
            <p>
              Gerege SSO үйлчилгээний бүх лого, дизайн, кодын эх сурвалж нь
              зохиогчийн эрхээр хамгаалагдсан бөгөөд зөвшөөрөлгүй хуулбарлах,
              түгээхийг хориглоно.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gerege-primary mb-4">
              8. Нөхцөлийн өөрчлөлт
            </h2>
            <p>
              Бид эдгээр нөхцөлийг хүссэн үедээ өөрчлөх эрхтэй. Өөрчлөлт оруулсан
              тохиолдолд хэрэглэгчдэд мэдэгдэнэ. Өөрчлөлтийн дараа үйлчилгээг
              үргэлжлүүлэн ашигласнаар та шинэ нөхцөлийг зөвшөөрсөнд тооцогдоно.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gerege-primary mb-4">
              9. Хууль зүй
            </h2>
            <p>
              Эдгээр нөхцөл нь Монгол Улсын хууль тогтоомжийн дагуу зохицуулагдана.
              Маргаан гарсан тохиолдолд Монгол Улсын шүүхээр шийдвэрлүүлнэ.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gerege-primary mb-4">
              10. Холбоо барих
            </h2>
            <p>
              Үйлчилгээний нөхцөлтэй холбоотой асуулт байвал:{' '}
              <a
                href="mailto:support@gerege.mn"
                className="text-gerege-primary hover:underline"
              >
                support@gerege.mn
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
