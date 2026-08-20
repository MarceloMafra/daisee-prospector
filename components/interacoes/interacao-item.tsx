'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { corDaTemperatura, parseSugestao, STATUS_LABELS } from '@/lib/interacao'
import { Archive, CheckCircle2, Copy, Linkedin, RotateCcw, User } from 'lucide-react'

export interface InteracaoView {
  id: string
  canal: string
  mensagem: string
  recebidaEm: string
  sugestao?: string | null
  status: string
  lead?: {
    id: string
    name: string
    company: string
    seniority?: string
    linkedinUrl?: string | null
  }
}

interface Props {
  interacao: InteracaoView
  /** URL do LinkedIn quando o lead não vem embutido na interação (caso da ficha). */
  linkedinUrl?: string | null
  /** Mostra nome/empresa do lead com link para a ficha — usado na caixa de entrada. */
  mostrarLead?: boolean
  onStatusChange: (interacaoId: string, status: string) => void
}

export function InteracaoItem({ interacao, linkedinUrl, mostrarLead = false, onStatusChange }: Props) {
  const [copiado, setCopiado] = useState(false)
  const { temperatura, leitura, replica } = parseSugestao(interacao.sugestao)
  const tratada = interacao.status !== 'NOVA'
  const urlLinkedin = interacao.lead?.linkedinUrl ?? linkedinUrl

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 ${
        tratada ? 'border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/30' : 'dark:border-gray-700'
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {mostrarLead && interacao.lead && (
          <Link
            href={`/dashboard/leads/${interacao.lead.id}`}
            className="text-sm font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5" />
            {interacao.lead.name}
            <span className="font-normal text-gray-500">· {interacao.lead.company}</span>
          </Link>
        )}
        <span className="text-xs text-gray-500">
          {interacao.canal === 'LINKEDIN' ? 'LinkedIn' : 'E-mail'} ·{' '}
          {new Date(interacao.recebidaEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
        {temperatura && (
          <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${corDaTemperatura(temperatura)}`}>
            {temperatura}
          </span>
        )}
        {tratada && (
          <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {STATUS_LABELS[interacao.status] ?? interacao.status}
          </span>
        )}
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
        {interacao.mensagem}
      </div>

      {leitura && <p className="text-xs text-gray-500 italic">{leitura}</p>}

      {replica && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wide text-green-700 dark:text-green-400">
            Sugestão de resposta
          </div>
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{replica}</p>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(replica)
            setCopiado(true)
            setTimeout(() => setCopiado(false), 2000)
          }}
        >
          <Copy className="w-3.5 h-3.5 mr-1.5" />
          {copiado ? 'Copiado!' : 'Copiar sugestão'}
        </Button>

        {urlLinkedin && (
          <Button size="sm" variant="outline" asChild>
            <a href={urlLinkedin} target="_blank" rel="noopener noreferrer">
              <Linkedin className="w-3.5 h-3.5 mr-1.5" />
              Abrir conversa
            </a>
          </Button>
        )}

        {tratada ? (
          <Button size="sm" variant="outline" onClick={() => onStatusChange(interacao.id, 'NOVA')}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reabrir
          </Button>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => onStatusChange(interacao.id, 'RESPONDIDA')}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Já respondi
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onStatusChange(interacao.id, 'ARQUIVADA')}>
              <Archive className="w-3.5 h-3.5 mr-1.5" />
              Arquivar
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
