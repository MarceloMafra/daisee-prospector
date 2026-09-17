'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ExternalLink, Loader2, Search, UserPlus, X } from 'lucide-react'

interface Candidato {
  providerId: string
  nome: string
  headline: string
  localizacao: string
  url: string | null
  grau: string | null
  conexoesEmComum: number | null
  nomeConfere: boolean
  nomeAbreviado: boolean
  citaEmpresa: boolean
  naEmpresaDoIndicador: boolean
  leadExistente: { id: string; name: string } | null
}

interface Resultado {
  lead: { id: string; name: string }
  jaExistia: boolean
  enriquecido: boolean
  bloqueio: string | null
  aviso: string | null
}

interface Props {
  interacaoId: string
  indicador: string
  onFechar: () => void
  /** Chamado ao fechar depois de cadastrar: a conversa já foi arquivada. */
  onConcluido: () => void
}

const GRAU: Record<string, string> = { DISTANCE_1: '1º grau', DISTANCE_2: '2º grau', DISTANCE_3: '3º grau' }

const campo =
  'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100'

// Painel do "Indicou outra pessoa": lê a indicação, mostra os perfis candidatos
// para a pessoa escolher, cadastra, gera a cadência e arquiva a conversa.
export function IndicacaoPainel({ interacaoId, indicador, onFechar, onConcluido }: Props) {
  const [buscando, setBuscando] = useState(true)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [nome, setNome] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [cargo, setCargo] = useState('')
  const [assunto, setAssunto] = useState<string | null>(null)
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [filtrouPelaEmpresa, setFiltrouPelaEmpresa] = useState(false)
  const [escolhido, setEscolhido] = useState('')
  const [urlManual, setUrlManual] = useState('')
  const [etapa, setEtapa] = useState<'' | 'cadastrando' | 'gerando'>('')
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [cadencia, setCadencia] = useState('')

  const buscar = async (manual?: { nome: string; empresa: string }) => {
    setBuscando(true)
    setErro('')
    setAviso('')
    try {
      const qs = manual ? `?${new URLSearchParams({ nome: manual.nome, empresa: manual.empresa })}` : ''
      const res = await fetch(`/api/interacoes/${interacaoId}/indicacao${qs}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      if (data.indicacao) {
        setNome(data.indicacao.nome)
        setEmpresa(data.indicacao.empresa)
        if (!manual) {
          setCargo(data.indicacao.cargo ?? '')
          setAssunto(data.indicacao.assunto ?? null)
        }
      } else if (!manual) {
        setEmpresa(data.empresaPadrao ?? '')
      }
      setAviso(data.aviso ?? '')
      setCandidatos(data.candidatos ?? [])
      setFiltrouPelaEmpresa(Boolean(data.filtrouPelaEmpresa))
      // Pré-seleciona só quando há um único candidato forte: na empresa de quem
      // indicou e com nome compatível. Dois ou mais, a escolha é da pessoa.
      const fortes = (data.candidatos ?? []).filter(
        (c: Candidato) => c.naEmpresaDoIndicador && (c.nomeConfere || c.nomeAbreviado) && !c.leadExistente
      )
      setEscolhido(fortes.length === 1 ? fortes[0].providerId : '')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha na busca.')
    } finally {
      setBuscando(false)
    }
  }

  useEffect(() => {
    buscar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interacaoId])

  const escolhidoInfo = candidatos.find((c) => c.providerId === escolhido)
  const podeCadastrar = Boolean(nome.trim() && empresa.trim() && (escolhido || urlManual.trim())) && !etapa

  const cadastrar = async () => {
    setErro('')
    setEtapa('cadastrando')
    try {
      const res = await fetch(`/api/interacoes/${interacaoId}/indicacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: urlManual.trim() ? null : escolhido,
          url: urlManual.trim() || escolhidoInfo?.url || null,
          nome: nome.trim(),
          empresa: empresa.trim(),
          cargo: cargo.trim() || null,
          assunto,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setResultado(data)

      if (data.jaExistia || data.bloqueio || !data.enriquecido) return

      setEtapa('gerando')
      const resCad = await fetch(`/api/interacoes/${interacaoId}/indicacao/cadencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: data.lead.id }),
      })
      const cad = await resCad.json()
      setCadencia(resCad.ok ? `Cadência gerada com ${cad.touches} touches.` : cad.error || 'Falha ao gerar a cadência.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao cadastrar.')
    } finally {
      setEtapa('')
    }
  }

  return (
    <div className="rounded-md border border-violet-300 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-900/20 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
          Indicação de {indicador}
        </span>
        <button
          onClick={resultado ? onConcluido : onFechar}
          disabled={Boolean(etapa)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {resultado ? (
        <div className="space-y-2 text-sm text-gray-800 dark:text-gray-200">
          <p>
            {resultado.jaExistia ? 'Já estava na base: ' : 'Lead criado: '}
            <Link
              href={`/dashboard/leads/${resultado.lead.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary-600 dark:text-primary-400 hover:underline"
            >
              {resultado.lead.name}
            </Link>
            . A conversa de {indicador} foi arquivada.
          </p>
          {resultado.bloqueio && (
            <p className="text-amber-700 dark:text-amber-400">
              Cadência não gerada: {resultado.bloqueio}. O lead ficou fora da automação — confira o perfil na ficha.
            </p>
          )}
          {resultado.aviso && <p className="text-amber-700 dark:text-amber-400">{resultado.aviso}</p>}
          {etapa === 'gerando' && (
            <p className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando a cadência com a indicação no T1...
            </p>
          )}
          {cadencia && <p>{cadencia} O convite entra na fila de envio; nada foi enviado.</p>}
          {!etapa && (
            <div className="flex justify-end">
              <Button size="sm" onClick={onConcluido}>
                Concluir
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              Nome
              <input className={campo} value={nome} onChange={(e) => setNome(e.target.value)} disabled={buscando} />
            </label>
            <label className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              Empresa
              <input className={campo} value={empresa} onChange={(e) => setEmpresa(e.target.value)} disabled={buscando} />
            </label>
            <label className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              Cargo ou área (opcional)
              <input className={campo} value={cargo} onChange={(e) => setCargo(e.target.value)} disabled={buscando} />
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => buscar({ nome: nome.trim(), empresa: empresa.trim() })}
              disabled={buscando || !nome.trim()}
            >
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Buscar de novo
            </Button>
            {assunto && <span className="text-xs text-gray-500">Assunto: {assunto}</span>}
          </div>

          {buscando ? (
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Lendo a indicação e buscando no LinkedIn...
            </p>
          ) : (
            <div className="space-y-1.5">
              {aviso && <p className="text-xs text-amber-700 dark:text-amber-400">{aviso}</p>}
              {candidatos.length > 0 && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  A busca do LinkedIn é aproximada. Abra o perfil antes de escolher.
                  {!filtrouPelaEmpresa && ' Não deu para filtrar pela empresa de quem indicou.'}
                </p>
              )}
              {candidatos.map((c) => (
                <label
                  key={c.providerId}
                  className={`flex items-start gap-2 rounded-md px-2 py-1.5 cursor-pointer ${
                    escolhido === c.providerId && !urlManual
                      ? 'bg-violet-100 dark:bg-violet-900/40'
                      : 'hover:bg-violet-100/60 dark:hover:bg-violet-900/20'
                  }`}
                >
                  <input
                    type="radio"
                    name={`indicado-${interacaoId}`}
                    checked={escolhido === c.providerId && !urlManual}
                    onChange={() => {
                      setEscolhido(c.providerId)
                      setUrlManual('')
                    }}
                    className="mt-1 accent-violet-600"
                  />
                  <span className="text-sm text-gray-800 dark:text-gray-200 min-w-0">
                    <span className="font-medium">{c.nome}</span>
                    {c.url && (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1.5 inline-flex items-center text-xs text-primary-600 dark:text-primary-400 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        ver perfil <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    )}
                    <span className="ml-1.5 inline-flex flex-wrap gap-1 align-middle">
                      {c.naEmpresaDoIndicador && <Selo cor="green">na empresa de {indicador.split(' ')[0]}</Selo>}
                      {c.nomeConfere && <Selo cor="green">nome confere</Selo>}
                      {!c.nomeConfere && c.nomeAbreviado && <Selo cor="gray">sobrenome abreviado</Selo>}
                      {c.citaEmpresa && <Selo cor="green">cita a empresa</Selo>}
                      {c.leadExistente && <Selo cor="amber">já é lead</Selo>}
                      {c.grau && GRAU[c.grau] && <Selo cor="gray">{GRAU[c.grau]}</Selo>}
                      {c.conexoesEmComum ? <Selo cor="gray">{c.conexoesEmComum} em comum</Selo> : null}
                    </span>
                    <span className="block text-xs text-gray-500 truncate">
                      {[c.headline, c.localizacao].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </label>
              ))}
              <label className="block text-xs text-gray-600 dark:text-gray-400 space-y-1 pt-1">
                Não está na lista? Cole a URL do perfil
                <input
                  className={campo}
                  placeholder="https://www.linkedin.com/in/..."
                  value={urlManual}
                  onChange={(e) => setUrlManual(e.target.value)}
                />
              </label>
            </div>
          )}

          {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}

          <div className="flex items-center gap-2 justify-end flex-wrap">
            <span className="text-xs text-gray-500 mr-auto">
              Cria o lead, confere o perfil, gera a cadência e arquiva esta conversa. Nada é enviado.
            </span>
            <Button size="sm" variant="ghost" onClick={onFechar} disabled={Boolean(etapa)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={cadastrar} disabled={!podeCadastrar || buscando}>
              {etapa ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5 mr-1.5" />}
              {etapa === 'cadastrando' ? 'Cadastrando e conferindo o perfil...' : 'Cadastrar indicação'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function Selo({ cor, children }: { cor: 'green' | 'amber' | 'gray'; children: React.ReactNode }) {
  const classes = {
    green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    gray: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  }[cor]
  return <span className={`text-[10px] font-medium rounded-full px-1.5 py-0.5 ${classes}`}>{children}</span>
}
