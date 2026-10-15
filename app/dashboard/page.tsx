'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  Inbox,
  Plus,
  RefreshCw,
  Send,
  Users,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { RitmoChart } from '@/components/relatorio/ritmo-chart'
import { decimal, horaBR, type Relatorio } from '@/components/relatorio/tipos'
import { cn } from '@/lib/utils'

interface Fases {
  totalLeads: number
  hotProspects: number
  averageScore: number
  statusBreakdown: Record<string, number>
}

const FASES: { chave: string; rotulo: string; cor: string }[] = [
  { chave: 'PROSPECTANDO', rotulo: 'Prospectando', cor: 'bg-brand-400' },
  { chave: 'QUALIFICADO', rotulo: 'Qualificado', cor: 'bg-mint-500' },
  { chave: 'EM_PROGRESSO', rotulo: 'Em progresso', cor: 'bg-primary-500' },
  { chave: 'DESCARTADO', rotulo: 'Descartado', cor: 'bg-gray-400' },
  { chave: 'PERDIDO', rotulo: 'Perdido', cor: 'bg-red-400' },
]

const pct = (parte: number, todo: number) => (todo ? Math.round((parte / todo) * 100) : 0)

function Cartao({
  titulo,
  acao,
  className,
  children,
}: {
  titulo: string
  acao?: { href: string; texto: string }
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-display font-bold text-brand-800 dark:text-white">{titulo}</h2>
        {acao && (
          <Link
            href={acao.href}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
          >
            {acao.texto}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

export default function DashboardPage() {
  const [dados, setDados] = useState<Relatorio | null>(null)
  const [fases, setFases] = useState<Fases | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  // Em sequência, não em paralelo: o banco tem pool de uma conexão.
  const carregar = async () => {
    setCarregando(true)
    setErro('')
    try {
      const r = await fetch('/api/relatorio')
      if (!r.ok) throw new Error('A rota do relatório respondeu ' + r.status)
      setDados(await r.json())
      try {
        const s = await fetch('/api/dashboard/stats')
        if (s.ok) setFases(await s.json())
      } catch {
        // as fases são complemento; o painel segue sem elas
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar o painel.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const cabecalho = (
    <PageHeader
      titulo="Dashboard"
      descricao={
        dados
          ? `Visão da campanha — lido do banco em ${horaBR(dados.geradoEm)}.`
          : 'Visão geral da campanha de prospecção.'
      }
      acoes={
        <>
          <Button variant="outline" size="sm" onClick={carregar} disabled={carregando}>
            <RefreshCw className={cn('w-4 h-4 mr-2', carregando && 'animate-spin')} />
            Atualizar
          </Button>
          <Link href="/dashboard/leads/import">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Importar leads
            </Button>
          </Link>
        </>
      }
    />
  )

  if (carregando && !dados) {
    return (
      <div className="space-y-8">
        {cabecalho}
        <p className="text-gray-500 py-12 text-center">Apurando os números…</p>
      </div>
    )
  }
  if (erro && !dados) {
    return (
      <div className="space-y-8">
        {cabecalho}
        <div className="py-12 text-center space-y-3">
          <p className="text-red-600 dark:text-red-400">{erro}</p>
          <button onClick={carregar} className="text-sm underline">
            Tentar de novo
          </button>
        </div>
      </div>
    )
  }
  if (!dados) return null

  const { funil, quota, score, aguardandoAceite, pendencias } = dados
  const aguardandoVoce = pendencias.aguardandoResposta.length
  const t2Prontos = pendencias.t2Prontos.length
  const quotaPct = Math.min(100, pct(quota.enviadosHoje, quota.limite))
  const maiorFaixa = Math.max(...Object.values(aguardandoAceite.faixas), 1)
  const totalFases = fases ? Object.values(fases.statusBreakdown).reduce((a, b) => a + b, 0) : 0

  const acoes = [
    {
      rotulo: 'Aguardando sua resposta',
      valor: aguardandoVoce,
      detalhe: aguardandoVoce ? 'leads esperando você na caixa' : 'ninguém esperando',
      href: '/dashboard/interacoes',
      icone: Inbox,
      alerta: aguardandoVoce > 0 ? 'vermelho' : 'ok',
    },
    {
      rotulo: 'Aceites prontos para o T2',
      valor: t2Prontos,
      detalhe: t2Prontos ? 'DM de abordagem ainda não enviada' : 'fila de T2 vazia',
      href: '/dashboard/prospecting',
      icone: Send,
      alerta: t2Prontos > 0 ? 'ambar' : 'ok',
    },
    {
      rotulo: 'Fila de convites (T1)',
      valor: funil.filaT1,
      detalhe: `${funil.semCadencia} leads ainda sem cadência`,
      href: '/dashboard/leads',
      icone: Users,
      alerta: funil.filaT1 === 0 && funil.semCadencia > 0 ? 'ambar' : 'ok',
    },
    {
      rotulo: 'Touches com falha',
      valor: funil.falhas,
      detalhe: funil.falhas ? 'precisam de revisão' : 'nenhuma falha',
      href: '/dashboard/prospecting',
      icone: AlertTriangle,
      alerta: funil.falhas > 0 ? 'vermelho' : 'ok',
    },
  ] as const

  const corAlerta = {
    vermelho: 'border-l-red-500',
    ambar: 'border-l-amber-500',
    ok: 'border-l-primary-500',
  }

  // Cada etapa mostra a conversão sobre a etapa anterior do funil.
  const etapas = [
    { rotulo: 'Base', valor: funil.base, anterior: null as number | null },
    { rotulo: 'Convites enviados', valor: funil.convites, anterior: funil.base },
    { rotulo: 'Aceites', valor: funil.aceites, anterior: funil.convites },
    { rotulo: 'DMs T2', valor: funil.dms, anterior: funil.aceites },
    { rotulo: 'Responderam', valor: funil.respostas, anterior: funil.aceites },
    { rotulo: 'Qualificados', valor: funil.qualificados, anterior: funil.respostas },
  ]
  const topo = Math.max(funil.base, 1)

  return (
    <div className="space-y-8">
      {cabecalho}

      {/* Precisa de ação */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {acoes.map((a) => {
          const Icone = a.icone
          return (
            <Link
              key={a.rotulo}
              href={a.href}
              className={cn(
                'group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow',
                corAlerta[a.alerta]
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{a.rotulo}</span>
                <Icone className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
              </div>
              <span className="block text-4xl font-mono tabular-nums mt-2 text-brand-800 dark:text-white">
                {a.valor}
              </span>
              <span className="block text-xs text-gray-500 mt-1">{a.detalhe}</span>
            </Link>
          )
        })}
      </section>

      {/* Funil + cota do dia */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Cartao
          titulo="O funil da campanha"
          acao={{ href: '/dashboard/relatorio', texto: 'Relatório completo' }}
          className="xl:col-span-2"
        >
          <div className="space-y-3">
            {etapas.map((e) => (
              <div
                key={e.rotulo}
                className="grid grid-cols-[130px_1fr_90px] sm:grid-cols-[160px_1fr_110px] items-center gap-3"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{e.rotulo}</span>
                <span className="h-7 bg-gray-100 dark:bg-gray-900/60 rounded-md overflow-hidden">
                  <span
                    className="block h-full bg-primary-500 rounded-md transition-all"
                    style={{ width: `${Math.max(pct(e.valor, topo), e.valor ? 1.5 : 0)}%` }}
                  />
                </span>
                <span className="text-right font-mono tabular-nums text-sm text-brand-800 dark:text-white">
                  {e.valor}
                  {e.anterior !== null && (
                    <span className="text-gray-500 text-xs ml-1.5">{pct(e.valor, e.anterior)}%</span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">
            O percentual é a conversão sobre a etapa anterior. Taxa de aceite {funil.taxaAceite}% · de resposta{' '}
            {funil.taxaResposta}% sobre os convites.
            {funil.emails === 0 && ' Nenhum e-mail (T3–T5) enviado: a campanha roda toda no LinkedIn.'}
          </p>
        </Cartao>

        <Cartao titulo="Cota de hoje" acao={{ href: '/dashboard/prospecting', texto: 'Monitorar' }}>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-mono tabular-nums text-brand-800 dark:text-white">
              {quota.enviadosHoje}
            </span>
            <span className="text-gray-500 font-mono">/ {quota.limite} convites</span>
          </div>
          <div className="h-2.5 bg-gray-100 dark:bg-gray-900/60 rounded-full overflow-hidden mt-4">
            <div
              className="h-full bg-primary-500 rounded-full transition-all"
              style={{ width: `${quotaPct}%` }}
            />
          </div>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-gray-600 dark:text-gray-400">Último envio</dt>
              <dd className="font-mono text-gray-900 dark:text-white">
                {quota.ultimoEnvio ? horaBR(quota.ultimoEnvio) : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-600 dark:text-gray-400">Dias sem envio</dt>
              <dd className="font-mono text-gray-900 dark:text-white">{quota.diasSemEnvio ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-600 dark:text-gray-400">Prontos na fila</dt>
              <dd className="font-mono text-gray-900 dark:text-white">{funil.filaT1}</dd>
            </div>
          </dl>
          <p className="text-xs text-gray-500 mt-4">
            O ritmo é diário: dias parados não viram crédito para recuperar em rajada.
          </p>
        </Cartao>
      </div>

      {/* Ritmo */}
      <Cartao titulo="Ritmo diário" acao={{ href: '/dashboard/relatorio', texto: 'Ver detalhes' }}>
        <RitmoChart ritmo={dados.ritmo} />
      </Cartao>

      {/* Distribuições */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Cartao titulo="Leads por fase" acao={{ href: '/dashboard/pipeline', texto: 'Funil de Vendas' }}>
          {fases ? (
            <>
              <div className="space-y-2.5">
                {FASES.map((f) => {
                  const qtd = fases.statusBreakdown[f.chave] ?? 0
                  return (
                    <div key={f.chave} className="grid grid-cols-[110px_1fr_44px] items-center gap-3 text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{f.rotulo}</span>
                      <span className="h-2 bg-gray-100 dark:bg-gray-900/60 rounded-full overflow-hidden">
                        <span
                          className={cn('block h-full rounded-full', f.cor)}
                          style={{ width: `${pct(qtd, totalFases)}%` }}
                        />
                      </span>
                      <span className="font-mono tabular-nums text-right text-gray-600 dark:text-gray-400">
                        {qtd}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 mt-4">
                {fases.hotProspects} leads com prioridade alta · score médio {decimal(fases.averageScore)}.
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">Distribuição indisponível agora. Atualize para tentar de novo.</p>
          )}
        </Cartao>

        <Cartao titulo="Convites aguardando aceite" acao={{ href: '/dashboard/relatorio', texto: 'Detalhes' }}>
          <div className="space-y-2.5">
            {Object.entries(aguardandoAceite.faixas).map(([faixa, qtd]) => (
              <div key={faixa} className="grid grid-cols-[72px_1fr_36px] items-center gap-3 text-sm">
                <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                  {faixa === '10+' ? '10 d ou +' : `${faixa} dias`}
                </span>
                <span className="h-2 bg-gray-100 dark:bg-gray-900/60 rounded-full overflow-hidden">
                  <span
                    className={cn('block h-full rounded-full', faixa === '10+' ? 'bg-amber-500' : 'bg-blue-500')}
                    style={{ width: `${(qtd / maiorFaixa) * 100}%` }}
                  />
                </span>
                <span className="font-mono tabular-nums text-right text-gray-600 dark:text-gray-400">{qtd}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">
            {aguardandoAceite.total} pendentes. Quem passou de dez dias dificilmente aceita.
          </p>
        </Cartao>

        <Cartao titulo="O score prevê quem responde">
          <div className="space-y-3">
            {[
              { nome: 'Média da base', v: score.base, forte: false },
              { nome: 'Média de quem aceitou', v: score.aceitos, forte: true },
              { nome: 'Média de quem respondeu', v: score.responderam, forte: true },
            ].map((l) => (
              <div key={l.nome} className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">{l.nome}</span>
                <span
                  className={cn(
                    'font-mono text-xl tabular-nums',
                    l.forte ? 'text-primary-600 dark:text-primary-400' : 'text-brand-800 dark:text-white'
                  )}
                >
                  {decimal(l.v)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">
            {decimal(score.aceitos - score.base)} pontos acima da base entre quem aceitou: priorizar a fila por
            score tem efeito real.
          </p>
        </Cartao>
      </div>

      {/* Respostas que esperam por você */}
      {aguardandoVoce > 0 && (
        <Cartao titulo="Esperando sua resposta" acao={{ href: '/dashboard/interacoes', texto: 'Abrir a caixa' }}>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {pendencias.aguardandoResposta.slice(0, 5).map((p) => (
              <div key={p.nome + p.horas} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {p.nome} <span className="text-gray-500 font-normal">· {p.empresa}</span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">“{p.mensagem}”</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="block text-xs font-mono text-red-600 dark:text-red-400">{p.horas} h</span>
                  <span className="block text-xs font-mono text-gray-500">score {decimal(p.score)}</span>
                </div>
              </div>
            ))}
          </div>
        </Cartao>
      )}

      {/* Atalhos */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { href: '/dashboard/leads', rotulo: 'Base de Leads', icone: Users },
          { href: '/dashboard/pipeline', rotulo: 'Funil de Vendas', icone: Zap },
          { href: '/dashboard/interacoes', rotulo: 'Respostas & DM', icone: Inbox },
          { href: '/dashboard/compliance', rotulo: 'Compliance de Copy', icone: AlertTriangle },
        ].map((a) => {
          const Icone = a.icone
          return (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center justify-between gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-semibold text-brand-800 dark:text-white hover:border-primary-500 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Icone className="w-4 h-4 text-primary-500" />
                {a.rotulo}
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </Link>
          )
        })}
      </section>
    </div>
  )
}
