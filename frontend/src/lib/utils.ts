export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('mn-MN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(dateStr: string | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString('mn-MN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function maskText(text: string | undefined): string {
  if (!text || text === '—') return '—'
  if (text.length <= 4) return '****'
  return text.slice(0, 2) + '******' + text.slice(-2)
}

export function truncate(str: string | undefined, len: number): string {
  if (!str) return ''
  return str.length > len ? str.substring(0, len) + '...' : str
}

export function escapeHtml(text: string | undefined): string {
  if (!text) return ''
  if (typeof document === 'undefined') {
    return text.replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c
    )
  }
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}

export function getInitials(name: string | undefined): string {
  if (!name) return 'G'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getVerificationLevel(user: { verification_level?: number }): number {
  return user.verification_level || 1
}
