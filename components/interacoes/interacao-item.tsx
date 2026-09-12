'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { corDaTemperatura, parseSugestao, STATUS_LABELS } from '@/lib/interacao'
import { Archive, CheckCircle2, Copy, Linkedin, RotateCcw, Send, User, X } from 'lucide-react'

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
    status?: string
    linkedinProviderId?: string | null
  }
}

// As fases do pipeline, na ordem do quadro. Arquivar uma conversa quase sempre
// quer dizer que o lead mudou de fase — a caixa pergunta em vez de deixar o
// pipeline mentindo.
const FASES: { valor: string; label: string; dica: string }[] = [
  { valor: 'PROSPECTANDO', label: 'Prospectando', dica: 'segue no funil, sem conversa aberta' },
  { valor: 'QUALIFICADO', label: 'Qualificado', dica: 'demonstrou interesse real' },
  { valor: 'EM_PROGRESSO', label: 'Em Progresso', dica: 'negociação em andamento' },
  { valor: 'DESCARTADO', label: 'Descartado', dica: 'não é perfil, ou encerrou a conversa' },
  { valor: 'PERDIDO', label: 'Perdido', dica: 'era perfil, mas não avançou' },
]

interface Props {
  interacao: InteracaoView
  /** URL do LinkedIn quando o lead não vem embutido na interação (caso da ficha). */
  linkedinUrl?: string | null
  /** Mostra nome/empresa do lead com link para a ficha — usado na caixa de entrada. */
  mostrarLead?: boolean
  onStatusChange: (interacaoId: string, status: string) => void
  /** Recarrega a lista depois de enviar uma resposta ou mover o lead de fase. */
  onAtualizar?: () => void
}

export function InteracaoItem({
  interacao,
  linkedinUrl,
  mostrarLead = false,
  onStatusChange,
  onAtualizar,
}: Props) {
  const [copiado, setCopiado] = useState(false)
  const [respondendo, setRespondendo] = useState(false)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')
  const [arquivando, setArquivando] = useState(false)
  const [faseEscolhida, setFaseEscolhida] = useState('')
  const [salvandoFase, setSalvandoFase] = useState(false)

  const { temperatura, leitura, replica } = parseSugestao(interacao.sugestao)
  const tratada = interacao.status !== 'NOVA'
  const urlLinkedin = interacao.lead?.linkedinUrl ?? linkedinUrl
  const podeResponderAqui = interacao.canal === 'LINKEDIN' && Boolean(interacao.lead?.linkedinProviderId)
  const faseAtual = interacao.lead?.status ?? 'PROSPECTANDO'

  const abrirResposta = () => {
    setTexto(replica || '')
    setErroEnvio('')
    setRespondendo(true)
  }

  const enviarResposta = async () => {
    if (!texto.trim()) return

    // Um clique aqui manda a mensagem de verdade, sem volta. A confirmação diz
    // para quem vai e mostra o começo do texto — em 12/09 uma mensagem de teste
    // saiu para um lead real justamente porque nada perguntava antes.
    const destinatario = interacao.lead?.name ?? 'o lead'
    const previa = texto.trim().slice(0, 180)
    const ok = confirm(
      `Enviar esta mensagem agora para ${destinatario}, no LinkedIn?\n\n` +
      `"${previa}${texto.trim().length > 180 ? '...' : ''}"\n\n` +
      `A mensagem sai de verdade e não dá para desfazer por aqui.`
    )
    if (!ok) return

    setEnviando(true)
    setErroEnvio('')
    try {
      const res = await fetch(`/api/interacoes/${interacao.id}/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detalhe = data.violacoes?.length
          ? ` ${data.violacoes.map((v: { rotulo: string }) => v.rotulo).join(', ')}.`
          : ''
        setErroEnvio((data.error || `Falha (HTTP ${res.status})`) + detalhe)
        return
      }
      setRespondendo(false)
      onAtualizar?.()
    } catch (e) {
      setErroEnvio(e instanceof Error ? e.message : 'Falha de rede.')
    } finally {
      setEnviando(false)
    }
  }

  const abrirArquivamento = () => {
    setFaseEscolhida(faseAtual)
    setArquivando(true)
  }

  const confirmarArquivamento = async () => {
    setSalvandoFase(true)
    try {
      if (faseEscolhida && faseEscolhida !== faseAtual && interacao.lead?.id) {
        await fetch(`/api/leads/${interacao.lead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: faseEscolhida }),
        })
      }
      setArquivando(false)
      onStatusChange(interacao.id, 'ARQUIVADA')
      onAtualizar?.()
    } finally {
      setSalvandoFase(false)
    }
  }

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
            target="_blank"
            rel="noopener noreferrer"
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

      {/* Escrever a resposta sem sair da caixa de entrada */}
      {respondendo && (
        <div className="rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-900/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-400">
              Resposta para {interacao.lead?.name ?? 'o lead'}
            </span>
            <button
              onClick={() => setRespondendo(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            rows={7}
            disabled={enviando}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-60"
            placeholder="Escreva a resposta..."
          />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">{texto.length} caracteres</span>
            <div className="flex-1" />
            <Button size="sm" variant="ghost" onClick={() => setRespondendo(false)} disabled={enviando}>
              Cancelar
            </Button>
            <Button size="sm" onClick={enviarResposta} disabled={enviando || !texto.trim()}>
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {enviando ? 'Enviando...' : 'Enviar agora'}
            </Button>
          </div>
          {erroEnvio && <p className="text-xs text-red-600 dark:text-red-400">{erroEnvio}</p>}
        </div>
      )}

      {/* Arquivar quase sempre significa que o lead mudou de fase */}
      {arquivando && (
        <div className="rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-3">
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              Antes de arquivar: em que fase fica {interacao.lead?.name?.split(' ')[0] ?? 'o lead'}?
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
              Hoje está em <strong>{FASES.find(f => f.valor === faseAtual)?.label ?? faseAtual}</strong>. Arquivar
              a conversa não move o lead sozinho.
            </p>
          </div>
          <div className="space-y-1">
            {FASES.map(f => (
              <label
                key={f.valor}
                className={`flex items-start gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors ${
                  faseEscolhida === f.valor
                    ? 'bg-amber-100 dark:bg-amber-900/40'
                    : 'hover:bg-amber-100/60 dark:hover:bg-amber-900/20'
                }`}
              >
                <input
                  type="radio"
                  name={`fase-${interacao.id}`}
                  value={f.valor}
                  checked={faseEscolhida === f.valor}
                  onChange={() => setFaseEscolhida(f.valor)}
                  className="mt-0.5 accent-amber-600"
                />
                <span className="text-sm text-gray-800 dark:text-gray-200">
                  {f.label}
                  {f.valor === faseAtual && <span className="text-xs text-gray-500"> · atual</span>}
                  <span className="block text-xs text-gray-500">{f.dica}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setArquivando(false)} disabled={salvandoFase}>
              Cancelar
            </Button>
            <Button size="sm" onClick={confirmarArquivamento} disabled={salvandoFase}>
              <Archive className="w-3.5 h-3.5 mr-1.5" />
              {salvandoFase
                ? 'Salvando...'
                : faseEscolhida === faseAtual
                  ? 'Arquivar sem mover'
                  : `Arquivar e mover`}
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {!tratada && podeResponderAqui && !respondendo && (
          <Button size="sm" onClick={abrirResposta}>
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Enviar resposta
          </Button>
        )}

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
            <Button size="sm" variant="ghost" onClick={abrirArquivamento}>
              <Archive className="w-3.5 h-3.5 mr-1.5" />
              Arquivar
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
