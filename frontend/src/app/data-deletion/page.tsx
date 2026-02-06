'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, Input, Textarea } from '@/components/ui'

export default function DataDeletionPage() {
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!agreed) {
      alert('Та буцаагдахгүй гэдгийг зөвшөөрөх хэрэгтэй.')
      return
    }

    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setSubmitted(true)
    setIsSubmitting(false)
  }

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
          Өгөгдөл устгах заавар
        </h1>

        <div className="space-y-8 text-white/85 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gerege-primary mb-4">
              Танилцуулга
            </h2>
            <p>
              Gerege SSO нь таны хувийн мэдээллийг хянах эрхийг бүрэн хүндэтгэдэг.
              Та хүссэн үедээ бүртгэлээ болон холбогдох бүх өгөгдлөө устгуулах
              хүсэлт гаргаж болно.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gerege-primary mb-4">
              Устгагдах өгөгдөл
            </h2>
            <p className="mb-3">
              Хүсэлт гаргасны дараа дараах мэдээллүүд бүрмөсөн устгагдана:
            </p>
            <ul className="list-disc pl-8 space-y-2">
              <li>
                Хэрэглэгчийн бүртгэлийн мэдээлэл (имэйл, нэр, профайл зураг)
              </li>
              <li>Gen ID буюу өвөрмөц таних дугаар</li>
              <li>Google холболтын мэдээлэл</li>
              <li>Иргэний баталгаажуулалтын мэдээлэл (хэрэв байгаа бол)</li>
              <li>Нэвтрэлтийн түүх болон сессийн мэдээлэл</li>
              <li>Аудитын бүртгэл</li>
            </ul>
          </section>

          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
            <p className="text-white/85">
              <strong className="text-orange-400">Анхааруулга:</strong> Өгөгдөл
              устгах үйлдэл буцаагдахгүй. Устгасны дараа таны бүртгэл болон
              түүнтэй холбоотой бүх мэдээлэл сэргээгдэх боломжгүй.
            </p>
          </div>

          <section>
            <h2 className="text-xl font-semibold text-gerege-primary mb-4">
              Өгөгдөл устгах үе шатууд
            </h2>
            <ol className="list-decimal pl-8 space-y-2">
              <li>Доорх маягтыг бөглөж хүсэлт илгээнэ үү</li>
              <li>Бид таны имэйл хаягаар баталгаажуулах холбоос илгээнэ</li>
              <li>Холбоосоор орж устгахаа баталгаажуулна уу</li>
              <li>Таны өгөгдөл 30 хоногийн дотор бүрмөсөн устгагдана</li>
            </ol>
          </section>

          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8">
            <h3 className="text-xl font-semibold text-red-400 mb-5">
              Өгөгдөл устгах хүсэлт
            </h3>

            {submitted ? (
              <div className="bg-green-500/20 border border-green-500/50 p-4 rounded-lg text-green-400">
                <strong>Хүсэлт хүлээн авлаа!</strong>
                <br />
                {email} хаягаар баталгаажуулах имэйл илгээгдэх болно. Имэйлээ
                шалгана уу.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  type="email"
                  label="Бүртгэлтэй имэйл хаяг *"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <Textarea
                  label="Устгах шалтгаан (заавал биш)"
                  placeholder="Яагаад устгахыг хүсэж байгаагаа бичнэ үү..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1"
                    required
                  />
                  <span className="text-sm text-white/80">
                    Өгөгдөл устгах нь буцаагдахгүй гэдгийг ойлгож байна
                  </span>
                </label>

                <Button
                  type="submit"
                  variant="danger"
                  className="bg-red-500 from-red-500 to-red-500"
                  isLoading={isSubmitting}
                >
                  Хүсэлт илгээх
                </Button>
              </form>
            )}
          </div>

          <section>
            <h2 className="text-xl font-semibold text-gerege-primary mb-4">
              Холбоо барих
            </h2>
            <p>
              Өгөгдөл устгахтай холбоотой асуулт байвал холбоо барина уу:{' '}
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
