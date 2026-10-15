import { ReactNode } from 'react'

interface PageHeaderProps {
  titulo: string
  descricao?: ReactNode
  /** Botões ou links à direita do título. */
  acoes?: ReactNode
}

/** Bloco de título padrão das telas: título, subtítulo e ações. */
export function PageHeader({ titulo, descricao, acoes }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold text-brand-800 dark:text-white">{titulo}</h1>
        {descricao && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5">{descricao}</p>
        )}
      </div>
      {acoes && <div className="flex items-center gap-2 flex-wrap">{acoes}</div>}
    </div>
  )
}
