'use client'

import { Card, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

interface VerificationProgressProps {
  level: number
  onVerifyPhone?: () => void
  onVerifyDan?: () => void
  onVerifyFace?: () => void
}

export function VerificationProgress({
  level,
  onVerifyPhone,
  onVerifyDan,
  onVerifyFace,
}: VerificationProgressProps) {
  const steps = [
    {
      id: 'email',
      label: 'Имэйл',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'phone',
      label: 'Утас',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      action: onVerifyPhone,
    },
    {
      id: 'dan',
      label: 'Регистр',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
        </svg>
      ),
      action: onVerifyDan,
    },
    {
      id: 'face',
      label: 'Царай',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      action: onVerifyFace,
    },
  ]

  const percentage = (level / 4) * 100

  return (
    <Card hover>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Баталгаажуулалтын түвшин</h2>
        <Badge variant="success">Түвшин {level}</Badge>
      </div>

      {/* Progress Bar */}
      <div className="relative mb-6">
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="progress-fill h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        {steps.map((step, idx) => {
          const isCompleted = idx < level
          const isCurrent = idx === level

          return (
            <div key={step.id} className="text-center">
              <div
                className={cn(
                  'w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-full border-2 flex items-center justify-center mb-2 transition-all',
                  isCompleted
                    ? 'bg-indigo-100 dark:bg-indigo-500/20 border-indigo-500'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                )}
              >
                <span
                  className={cn(
                    isCompleted ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'
                  )}
                >
                  {step.icon}
                </span>
              </div>
              <span
                className={cn(
                  'text-xs sm:text-sm',
                  isCompleted ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'
                )}
              >
                {step.label}
              </span>
              {isCompleted ? (
                <div className="text-xs text-indigo-500 mt-1">
                  ✓ Баталгаажсан
                </div>
              ) : step.action ? (
                <button
                  onClick={step.action}
                  className="text-xs text-indigo-500 hover:underline mt-1"
                >
                  Баталгаажуулах
                </button>
              ) : null}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
