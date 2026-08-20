// Helpers compartilhados entre a ficha do lead e a caixa de entrada.
// A sugestão é gravada pelo monitor como "[TEMPERATURA] leitura\n\ntexto da réplica".

export interface SugestaoPartes {
  temperatura: string
  leitura: string
  replica: string
}

export function parseSugestao(sugestao?: string | null): SugestaoPartes {
  const match = sugestao?.match(/^\[(\w+)\]\s*([\s\S]*?)\n\n([\s\S]*)$/)
  return {
    temperatura: match?.[1] || '',
    leitura: match?.[2] || '',
    replica: match?.[3] || sugestao || '',
  }
}

export const TEMPERATURA_CLASSES: Record<string, string> = {
  QUENTE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  MORNO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  FRIO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  NEGATIVO: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

export function corDaTemperatura(temperatura: string): string {
  return TEMPERATURA_CLASSES[temperatura] || TEMPERATURA_CLASSES.FRIO
}

export const STATUS_LABELS: Record<string, string> = {
  NOVA: 'Aguardando resposta',
  RESPONDIDA: 'Já respondida',
  ARQUIVADA: 'Arquivada',
}
