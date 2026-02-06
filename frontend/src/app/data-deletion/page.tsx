'use client'

import { useState } from 'react'
import { Header } from '@/components/layout'
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
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setSubmitted(true)
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 md:p-10">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 pb-5 border-b border-slate-200 dark:border-slate-700">
            Өгөгдөл устгах заавар
          </h1>

          <div className="space-y-8 text-slate-600 dark:text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                Танилцуулга
              </h2>
              <p>
                Gerege SSO нь таны хувийн мэдээллийг хянах эрхийг бүрэн хүндэтгэдэг.
                Та хүссэн үедээ бүртгэлээ болон холбогдох бүх өгөгдлөө устгуулах
                хүсэлт гаргаж болно.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                Устгагдах өгөгдөл
              </h2>
              <p className="mb-3">
                Хүсэлт гаргасны дараа дараах мэдээллүүд бүрмөсөн устгагдана:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-500 dark:text-slate-400">
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

            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4">
              <p className="text-slate-700 dark:text-slate-300">
                <strong className="text-amber-600 dark:text-amber-400">Анхааруулга:</strong> Өгөгдөл
                устгах үйлдэл буцаагдахгүй. Устгасны дараа таны бүртгэл болон
                түүнтэй холбоотой бүх мэдээлэл сэргээгдэх боломжгүй.
              </p>
            </div>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                Өгөгдөл устгах үе шатууд
              </h2>
              <ol className="list-decimal pl-6 space-y-2 text-slate-500 dark:text-slate-400">
                <li>Доорх маягтыг бөглөж хүсэлт илгээнэ үү</li>
                <li>Бид таны имэйл хаягаар баталгаажуулах холбоос илгээнэ</li>
                <li>Холбоосоор орж устгахаа баталгаажуулна уу</li>
                <li>Таны өгөгдөл 30 хоногийн дотор бүрмөсөн устгагдана</li>
              </ol>
            </section>

            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-5">
                Өгөгдөл устгах хүсэлт
              </h3>

              {submitted ? (
                <div className="bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/50 p-4 rounded-xl text-emerald-700 dark:text-emerald-400">
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
                      className="mt-1 w-4 h-4 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                      required
                    />
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Өгөгдөл устгах нь буцаагдахгүй гэдгийг ойлгож байна
                    </span>
                  </label>

                  <Button
                    type="submit"
                    variant="danger"
                    className="bg-red-500 hover:bg-red-600"
                    isLoading={isSubmitting}
                  >
                    Хүсэлт илгээх
                  </Button>
                </form>
              )}
            </div>

            <section>
              <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                Холбоо барих
              </h2>
              <p>
                Өгөгдөл устгахтай холбоотой асуулт байвал холбоо барина уу:{' '}
                <a
                  href="mailto:privacy@gerege.mn"
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
                >
                  privacy@gerege.mn
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
