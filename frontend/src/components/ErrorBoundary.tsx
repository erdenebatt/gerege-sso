'use client'

import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-5 bg-slate-50 dark:bg-slate-900">
          <div className="glass rounded-2xl p-10 w-full max-w-[420px] text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-3xl flex items-center justify-center mx-auto mb-5">
              !
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
              Алдаа гарлаа
            </h2>
            <p className="text-slate-600 dark:text-white/70 mb-5 text-sm">
              Уучлаарай, системд алдаа гарлаа. Хуудсыг дахин ачаалж үзнэ үү.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-indigo-600 dark:bg-white text-white dark:text-slate-900 rounded-xl font-medium hover:-translate-y-0.5 hover:shadow-lg transition-all"
            >
              Дахин ачаалах
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
