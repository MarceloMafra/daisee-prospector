'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { InteracaoItem, InteracaoView } from '@/components/interacoes/interacao-item'
import { Inbox, Loader2 } from 'lucide-react'

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

export default function InteracoesPage() {
  const [interacoes, setInteracoes] = useState<InteracaoView[]>([])
  const [contagem, setContagem] = useState<Contagem>({ NOVA: 0, RESPONDIDA: 0, ARQUIVADA: 0 })
  const [filtro, setFiltro] = useState<Filtro>('NOVA')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Inbox className="w-6 h-6 text-green-600" />
          Respostas dos leads
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Tudo o que os leads responderam, com a sugestão de réplica gerada pela IA. Nada é enviado automaticamente — e
          nada some: o que você marcar como respondido ou arquivado continua acessível pelas abas.
        </p>
      </div>

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
          {interacoes.map((interacao) => (
            <InteracaoItem
              key={interacao.id}
              interacao={interacao}
              mostrarLead
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}
