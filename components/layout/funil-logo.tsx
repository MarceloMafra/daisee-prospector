import { cn } from '@/lib/utils'

interface FunilLogoProps {
  /** Sobre fundo escuro o último nível é clareado para manter o contraste. */
  onDark?: boolean
  className?: string
}

/**
 * Funil da Master Vendas (ícone), em SVG inline.
 * Fica inline de propósito: o middleware redireciona qualquer arquivo de
 * `public/` para /login quando não há sessão, e a marca precisa aparecer na
 * própria tela de login.
 */
export function FunilLogo({ onDark = false, className }: FunilLogoProps) {
  return (
    <svg
      viewBox="0 0 514 536"
      aria-hidden
      focusable="false"
      className={cn('h-9 w-auto shrink-0', className)}
      fill="none"
      strokeWidth={19}
      strokeLinejoin="round"
    >
      <path d="M47.1 48.4Q40.2 27.5 62.2 27.5L455.3 27.5Q477.3 27.5 469.9 48.2L454.1 92.8Q446.7 113.5 424.7 113.5L90.8 113.5Q68.8 113.5 61.9 92.6Z" className="stroke-mint-400" />
      <path d="M89.1 174.4Q82.2 153.5 104.2 153.5L413.3 153.5Q435.3 153.5 427.9 174.2L412.1 218.8Q404.7 239.5 382.7 239.5L132.8 239.5Q110.8 239.5 103.9 218.6Z" className="stroke-primary-500" />
      <path d="M131.1 299.4Q124.2 278.5 146.2 278.5L371.3 278.5Q393.3 278.5 385.9 299.2L370.1 343.8Q362.7 364.5 340.7 364.5L174.8 364.5Q152.8 364.5 145.9 343.6Z" className="stroke-primary-500" />
      <path d="M171.1 425.4Q164.2 404.5 186.2 404.5L331.3 404.5Q353.3 404.5 345.9 425.2L330.1 469.8Q322.7 490.5 300.7 490.5L214.8 490.5Q192.8 490.5 185.9 469.6Z" className={onDark ? 'stroke-brand-300' : 'stroke-brand-500 dark:stroke-brand-300'} />
    </svg>
  )
}
