import { cn } from '@/lib/utils'

interface BrandProps {
  /** `dark`: sobre fundo petróleo (barra lateral). `light`: sobre fundo claro/escuro de página. */
  tone?: 'dark' | 'light'
  /** Mostra a linha "Excelência em vendas" sob o nome. */
  tagline?: boolean
  className?: string
}

/** Marca do produto: selo MV + MV-Prospector + selo PRO. */
export function Brand({ tone = 'light', tagline = false, className }: BrandProps) {
  const onDark = tone === 'dark'

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500 font-display text-sm font-extrabold tracking-tight text-white shadow-sm"
      >
        MV
      </span>
      <span className="flex flex-col leading-tight">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              'font-display text-lg font-bold tracking-tight',
              onDark ? 'text-white' : 'text-brand-800 dark:text-white'
            )}
          >
            MV-Prospector
          </span>
          <span className="rounded-full bg-mint-400 px-2 py-0.5 font-display text-[10px] font-extrabold tracking-wide text-brand-900">
            PRO
          </span>
        </span>
        {tagline && (
          <span
            className={cn(
              'mt-0.5 text-xs',
              onDark ? 'text-mint-300' : 'text-gray-500 dark:text-gray-400'
            )}
          >
            Excelência em vendas
          </span>
        )}
      </span>
    </div>
  )
}
