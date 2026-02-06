'use client'

import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

export function Badge({
  className,
  variant = 'default',
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-white/10 text-white/60',
    success: 'bg-gerege-primary/20 text-gerege-primary',
    warning: 'bg-orange-500/20 text-orange-400',
    danger: 'bg-red-500/20 text-red-400',
    info: 'bg-gerege-secondary/20 text-gerege-secondary',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
