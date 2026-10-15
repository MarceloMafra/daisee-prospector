'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, RefreshCw } from 'lucide-react'
import { RitmoChart } from '@/components/relatorio/ritmo-chart'
import { horaBR as hora, decimal, type Relatorio } from '@/components/relatorio/tipos'

// Cor do indicador é semântica, não decorativa: vermelho só onde alguém espera.
const CORES_SITUACAO: Record<string, string> = {
  'sua vez': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  'em progresso': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  'aguardando lead': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  perdido: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}

export default function RelatorioPage() {
  const [dados, setDados] = useState<Relatorio | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = async () => {
    setCarregando(true)
    setErro('')
    try {
      const r = await fetch('/api/relatorio')
      if (!r.ok) throw new Error('A rota do relatório respondeu ' + r.status)
      setDados(await r.json())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar o relatório.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  if (carregando && !dados) {
    return <p className="text-gray-500 py-12 text-center">Apurando os números…</p>
  }
  if (erro && !dados) {
    return (
      <div className="py-12 text-center space-y-3">
        <p className="text-red-600 dark:text-red-400">{erro}</p>
        <button onClick={carregar} className="text-sm underline">Tentar de novo</button>
      </div>
    )
  }
  if (!dados) return null

  const { funil, quota, score, aguardandoAceite, pendencias, conversas, ritmo } = dados
  const maiorFaixa = Math.max(...Object.values(aguardandoAceite.faixas), 1)

  const metricas = [
    { rotulo: 'Base', valor: funil.base, pe: `${funil.semCadencia} sem cadência` },
    { rotulo: 'Convites', valor: funil.convites, pe: `${funil.filaT1} na fila` },
    { rotulo: 'Aceites', valor: funil.aceites, pe: `${funil.taxaAceite}% dos convites` },
    { rotulo: 'DMs T2', valor: funil.dms, pe: `${pendencias.t2Prontos.length + pendencias.emConversaSemT2} aceites sem T2` },
    { rotulo: 'Respostas', valor: funil.respostas, pe: `${funil.taxaResposta}% dos convites` },
    { rotulo: 'Qualificados', valor: funil.qualificados, pe: funil.falhas ? `${funil.falhas} touches falhados` : 'nenhuma falha' },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Relatório da campanha</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
            Lido do banco agora — {hora(dados.geradoEm)}. Recarregue a página para atualizar.
          </p>
        </div>
        <button
          onClick={carregar}
          disabled={carregando}
          className="inline-flex items-center gap-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Ação primeiro: o que a operação precisa fazer hoje. */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Precisa de ação</h2>
        <div className="space-y-2">
          {pendencias.aguardandoResposta.map(p => (
            <div key={p.nome} className="flex gap-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="w-1 bg-red-500 shrink-0" />
              <div className="py-3 pr-4 flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {p.nome} <span className="text-gray-500 font-normal">· {p.empresa}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">“{p.mensagem}”</p>
              </div>
              <span className="py-3 pr-4 text-xs font-mono text-red-600 dark:text-red-400 whitespace-nowrap">
                {p.horas} h
              </span>
            </div>
          ))}

          {quota.diasSemEnvio !== null && quota.diasSemEnvio >= 1 && quota.enviadosHoje === 0 && (
            <div className="flex gap-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="w-1 bg-amber-500 shrink-0" />
              <div className="py-3 pr-4 flex-1">
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  Nenhum convite saiu {quota.diasSemEnvio === 1 ? 'hoje' : `há ${quota.diasSemEnvio} dias`}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Quota de {quota.limite}/dia sem uso, com {funil.filaT1} leads prontos na fila.
                </p>
              </div>
            </div>
          )}

          {pendencias.t2Prontos.length > 0 && (
            <div className="flex gap-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="w-1 bg-amber-500 shrink-0" />
              <div className="py-3 pr-4 flex-1">
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {pendencias.t2Prontos.length} aceites prontos para o T2
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {pendencias.t2Prontos.slice(0, 5).map(l => `${l.nome} (${l.empresa})`).join(' · ')}
                  {pendencias.t2Prontos.length > 5 && ` e mais ${pendencias.t2Prontos.length - 5}`}
                </p>
              </div>
            </div>
          )}

          {pendencias.aguardandoResposta.length === 0 && pendencias.t2Prontos.length === 0 && quota.enviadosHoje > 0 && (
            <p className="text-sm text-gray-500 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg px-4 py-6 text-center">
              Nada pendente: ninguém esperando resposta e a fila de T2 está vazia.
            </p>
          )}
        </div>
      </section>

      {/* Funil */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">O funil</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {metricas.map(m => (
            <div key={m.rotulo} className="bg-white dark:bg-gray-800 p-4">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-gray-500">{m.rotulo}</span>
              <span className="block text-2xl font-mono tabular-nums mt-1 text-gray-900 dark:text-white">{m.valor}</span>
              <span className="block text-xs text-gray-600 dark:text-gray-400 mt-1">{m.pe}</span>
            </div>
          ))}
        </div>
        {funil.emails === 0 && (
          <p className="text-sm text-gray-500">
            Nenhum e-mail (T3–T5) enviado até agora — a campanha inteira roda no LinkedIn.
          </p>
        )}
      </section>

      {/* Ritmo */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ritmo diário</h2>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <RitmoChart ritmo={ritmo} />
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Espera por aceite */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Convites aguardando aceite</h3>
          <div className="space-y-2">
            {Object.entries(aguardandoAceite.faixas).map(([faixa, qtd]) => (
              <div key={faixa} className="grid grid-cols-[64px_1fr_32px] items-center gap-3 text-sm">
                <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                  {faixa === '10+' ? '10 d ou +' : `${faixa} dias`}
                </span>
                <span className="h-2 bg-gray-100 dark:bg-gray-900 rounded-sm overflow-hidden">
                  <span
                    className={`block h-full ${faixa === '10+' ? 'bg-amber-500' : 'bg-sky-600/70'}`}
                    style={{ width: `${(qtd / maiorFaixa) * 100}%` }}
                  />
                </span>
                <span className="font-mono tabular-nums text-right text-gray-600 dark:text-gray-400">{qtd}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            {aguardandoAceite.total} pendentes. Os {aguardandoAceite.faixas['10+']} com mais de dez dias dificilmente
            aceitam — vale não contá-los na taxa corrente.
          </p>
        </section>

        {/* Score como preditor */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">O score prevê quem responde</h3>
          <div className="space-y-2.5">
            {[
              { nome: 'Média da base', v: score.base, forte: false },
              { nome: 'Média de quem aceitou', v: score.aceitos, forte: true },
              { nome: 'Média de quem respondeu', v: score.responderam, forte: true },
            ].map(l => (
              <div key={l.nome} className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">{l.nome}</span>
                <span className={`font-mono text-lg tabular-nums ${l.forte ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                  {decimal(l.v)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            {decimal(score.aceitos - score.base)} pontos acima da base entre quem aceitou.
            Priorizar a fila por score tem efeito real.
          </p>
        </section>
      </div>

      {/* Conversas: a lista completa fica em Cadências (Prospecções). Aqui só o resumo. */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Conversas abertas</h2>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-wrap items-center gap-x-8 gap-y-4">
          <div>
            <span className="block text-[10px] font-mono uppercase tracking-wider text-gray-500">Responderam</span>
            <span className="block text-3xl font-mono tabular-nums text-gray-900 dark:text-white">{conversas.length}</span>
          </div>
          {(['sua vez', 'em progresso', 'aguardando lead', 'perdido'] as const).map((sit) => (
            <div key={sit}>
              <span className={`inline-block text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded ${CORES_SITUACAO[sit]}`}>
                {sit}
              </span>
              <span className="block text-xl font-mono tabular-nums mt-1 text-gray-900 dark:text-white">
                {conversas.filter((c) => c.situacao === sit).length}
              </span>
            </div>
          ))}
          <Link
            href="/dashboard/prospecting"
            className="ml-auto inline-flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline"
          >
            Ver a lista completa em Cadências
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          A cadência automática fica pausada em todos os leads que responderam.
        </p>
      </section>
    </div>
  )
}
