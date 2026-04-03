import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatScore(score: number): string {
  return score.toFixed(1)
}

export function getScoreBadgeColor(score: number): string {
  if (score >= 80) return 'badge-success'
  if (score >= 50) return 'badge-warning'
  return 'badge-error'
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'QUALIFICADO':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
    case 'EM_PROGRESSO':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
    case 'DESCARTADO':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
    case 'PERDIDO':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
  }
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export function formatDatetime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}
