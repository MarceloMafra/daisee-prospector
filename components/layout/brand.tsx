import { cn } from '@/lib/utils'
import { FunilLogo } from '@/components/layout/funil-logo'

interface BrandProps {
  /** `dark`: sobre fundo petróleo (barra lateral). `light`: sobre fundo claro/escuro de página. */
  tone?: 'dark' | 'light'
  /** Mostra a linha "Excelência em vendas" sob o nome. */
  tagline?: boolean
  className?: string
}

/** Marca do produto: funil Master Vendas + MV-Prospector + selo PRO. */
export function Brand({ tone = 'light', tagline = false, className }: BrandProps) {
  const onDark = tone === 'dark'

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <FunilLogo onDark={onDark} />
      <span className="flex flex-col leading-tight">
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className={cn(
              'font-display text-base font-bold tracking-tight',
              onDark ? 'text-white' : 'text-brand-800 dark:text-white'
            )}
          >
            MV-Prospector
          </span>
          <span className="rounded-full bg-mint-400 px-1.5 py-0.5 font-display text-[10px] font-extrabold tracking-wide text-brand-900">
            PRO
          </span>
        </span>
        {tagline && (
          <span
            className={cn(
              'mt-0.5 whitespace-nowrap text-xs',
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
