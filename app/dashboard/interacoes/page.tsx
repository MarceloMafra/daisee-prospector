'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { InteracaoItem, InteracaoView } from '@/components/interacoes/interacao-item'
import { Inbox, Loader2, RefreshCw, Search, X } from 'lucide-react'

type Filtro = 'NOVA' | 'RESPONDIDA' | 'ARQUIVADA' | 'TODAS'

interface Contagem {
  NOVA: number
  RESPONDIDA: number
  ARQUIVADA: number
}

const ABAS: { valor: Filtro; label: string }[] = [
  { valor: 'NOVA', label: 'Aguardando resposta' },
  { valor: 'RESPONDIDA', label: 'Já respondidas' },
  { valor: 'ARQUIVADA', label: 'Arquivadas' },
  { valor: 'TODAS', label: 'Todas' },
]

const VAZIO: Record<Filtro, string> = {
  NOVA: 'Nenhuma resposta aguardando você. Quando um lead responder, ela aparece aqui com a sugestão de réplica.',
  RESPONDIDA: 'Nada marcado como respondido ainda.',
  ARQUIVADA: 'Nenhuma resposta arquivada.',
  TODAS: 'Nenhuma resposta registrada até agora.',
}

// "Debora" precisa achar a "Débora" — ninguém digita acento numa busca rápida.
const semAcento = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function InteracoesPage() {
  const [interacoes, setInteracoes] = useState<InteracaoView[]>([])
  const [contagem, setContagem] = useState<Contagem>({ NOVA: 0, RESPONDIDA: 0, ARQUIVADA: 0 })
  const [filtro, setFiltro] = useState<Filtro>('NOVA')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [varrendo, setVarrendo] = useState(false)
  const [resultadoVarredura, setResultadoVarredura] = useState('')
  const [busca, setBusca] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const query = filtro === 'TODAS' ? '' : `?status=${filtro}`
      const res = await fetch(`/api/interacoes${query}`)
      if (!res.ok) throw new Error('falha')
      const data = await res.json()
      setInteracoes(data.interacoes ?? [])
      setContagem(data.contagem ?? { NOVA: 0, RESPONDIDA: 0, ARQUIVADA: 0 })
      setErro('')
    } catch {
      setErro('Falha ao carregar as respostas.')
    } finally {
      setCarregando(false)
    }
  }, [filtro])

  useEffect(() => {
    carregar()
  }, [carregar])

  const termo = semAcento(busca.trim())
  const visiveis = useMemo(
    () =>
      termo
        ? interacoes.filter((i) => semAcento(`${i.lead?.name ?? ''} ${i.lead?.company ?? ''}`).includes(termo))
        : interacoes,
    [interacoes, termo]
  )

  // Atualizar a página só relê o banco. Quem estava esperando uma resposta
  // chegar dependia do cron (08:00 e 17:00 de Brasília) e não tinha como pedir
  // a varredura agora — o F5 parecia não funcionar.
  const varrerAgora = async () => {
    setVarrendo(true)
    setResultadoVarredura('')
    setErro('')
    try {
      const res = await fetch('/api/interacoes/varrer', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || data.ok === false) {
        setErro(data.mensagem ?? data.error ?? 'A varredura falhou.')
        return
      }
      setResultadoVarredura(data.mensagem ?? 'Varredura concluída.')
      await carregar()
    } catch {
      setErro('Não foi possível concluir a varredura. Ela pode levar alguns minutos — tente de novo.')
    } finally {
      setVarrendo(false)
    }
  }

  const handleStatusChange = async (interacaoId: string, status: string) => {
    try {
      await fetch(`/api/interacoes/${interacaoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      await carregar()
    } catch {
      setErro('Falha ao atualizar a interação.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Inbox className="w-6 h-6 text-green-600" />
            Respostas dos leads
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Tudo o que os leads responderam, com a sugestão de réplica gerada pela IA. Nada é enviado automaticamente — e
            nada some: o que você marcar como respondido ou arquivado continua acessível pelas abas.
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">
            A varredura automática roda às 08:00 e às 17:00. Atualizar a página não busca nada novo no LinkedIn — para
            isso, use o botão ao lado.
          </p>
        </div>
        <button
          onClick={varrerAgora}
          disabled={varrendo}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${varrendo ? 'animate-spin' : ''}`} />
          {varrendo ? 'Varrendo o LinkedIn…' : 'Varrer agora'}
        </button>
      </div>

      {varrendo && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Lendo as conversas e gerando as sugestões. Costuma levar de um a três minutos — pode deixar a aba aberta.
        </p>
      )}

      {resultadoVarredura && !varrendo && (
        <p className="text-sm text-green-700 dark:text-green-400">{resultadoVarredura}</p>
      )}

      <div className="flex gap-2 flex-wrap border-b border-border pb-3">
        {ABAS.map((aba) => {
          const total =
            aba.valor === 'TODAS'
              ? contagem.NOVA + contagem.RESPONDIDA + contagem.ARQUIVADA
              : contagem[aba.valor]
          const ativa = filtro === aba.valor
          return (
            <button
              key={aba.valor}
              onClick={() => setFiltro(aba.valor)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                ativa
                  ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-muted dark:hover:bg-gray-800'
              }`}
            >
              {aba.label}
              <span className="ml-1.5 text-xs opacity-70">{total}</span>
            </button>
          )
        })}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou empresa..."
          className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        {busca && (
          <button
            type="button"
            onClick={() => setBusca('')}
            aria-label="Limpar busca"
            className="absolute right-2 top-2 p-0.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {termo && !carregando && interacoes.length > 0 && (
        <p className="text-sm text-gray-600 dark:text-gray-400 -mt-2">
          {visiveis.length === 0
            ? `Nenhuma resposta de “${busca.trim()}” nesta aba.${filtro !== 'TODAS' ? ' Veja em Todas.' : ''}`
            : `${visiveis.length} resposta${visiveis.length > 1 ? 's' : ''} de ${interacoes.length} nesta aba.`}
        </p>
      )}

      {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}

      {carregando ? (
        <div className="flex items-center gap-2 text-gray-500 py-10">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando…
        </div>
      ) : interacoes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500 dark:text-gray-400 text-sm">
            {VAZIO[filtro]}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visiveis.map((interacao) => (
            <InteracaoItem
              key={interacao.id}
              interacao={interacao}
              mostrarLead
              onStatusChange={handleStatusChange}
              onAtualizar={carregar}
            />
          ))}
        </div>
      )}
    </div>
  )
}
