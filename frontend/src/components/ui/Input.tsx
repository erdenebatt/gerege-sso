'use client'

import { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm text-white/60 mb-2">{label}</label>
        )}
        <input
          type={type}
          className={cn(
            'w-full px-4 py-3 bg-black/30 border border-white/15 rounded-xl',
            'text-white placeholder:text-white/40',
            'focus:border-gerege-primary focus:ring-1 focus:ring-gerege-primary/20',
            'transition-all duration-200',
            error && 'border-red-500/50',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm text-white/60 mb-2">{label}</label>
        )}
        <textarea
          className={cn(
            'w-full px-4 py-3 bg-black/30 border border-white/15 rounded-xl',
            'text-white placeholder:text-white/40',
            'focus:border-gerege-primary focus:ring-1 focus:ring-gerege-primary/20',
            'transition-all duration-200 min-h-[100px] resize-y',
            error && 'border-red-500/50',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export { Textarea }
