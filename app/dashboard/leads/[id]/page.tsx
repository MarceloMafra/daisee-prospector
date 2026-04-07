'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Linkedin, Mail, Building2, User, Zap, MessageSquare } from 'lucide-react'

interface Touch {
  id: string
  sequence: number
  type: string
  channel: string
  content: string
  subject?: string
  status: string
}

interface Cadencia {
  id: string
  tone: string
  status: string
  touches: Touch[]
}

interface Lead {
  id: string
  name: string
  email: string
  company: string
  seniority: string
  daiseeScore: number
  status: string
  priority: string
  linkedinUrl?: string
  companySize: string
  segmentMatch: number
  cadencia?: Cadencia
  createdAt: string
}

const toneLabels: Record<string, string> = {
  CONSULTIVO: 'Consultivo',
  DIRETO: 'Direto',
  CRIATIVO: 'Criativo',
}

const touchTypeLabels: Record<string, string> = {
  LINKEDIN_250: 'LinkedIn (250 chars)',
  LINKEDIN_500: 'LinkedIn (500 chars)',
  EMAIL_T3: 'E-mail T3',
  EMAIL_T4: 'E-mail T4',
  EMAIL_T5: 'E-mail T5',
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedTone, setSelectedTone] = useState('CONSULTIVO')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchLead()
  }, [params.id])

  const fetchLead = async () => {
    try {
      const response = await fetch(`/api/leads/${params.id}`)
      if (!response.ok) {
        setError('Lead not found')
        return
      }
      const data = await response.json()
      setLead(data)
    } catch {
      setError('Failed to load lead')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateCadencia = async () => {
    if (!lead) return
    setGenerating(true)
    try {
      // Create cadencia first if doesn't exist
      let cadenciaId = lead.cadencia?.id
      if (!cadenciaId) {
        const cadRes = await fetch('/api/cadencias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: lead.id,
            tone: selectedTone,
            name: `Cadência - ${lead.name}`,
          }),
        })
        const cad = await cadRes.json()
        cadenciaId = cad.id
      }

      // Generate touches
      const genRes = await fetch(`/api/cadencias/${cadenciaId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone: selectedTone }),
      })

      if (!genRes.ok) throw new Error('Generation failed')

      await fetchLead()
    } catch {
      setError('Falha ao gerar cadência. Tente novamente.')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <p className="text-gray-500">Carregando lead...</p>
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-4">
        <p className="text-red-500">{error || 'Lead não encontrado'}</p>
        <Button onClick={() => router.push('/dashboard/leads')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
    )
  }

  const scoreColor =
    lead.daiseeScore >= 80
      ? 'text-green-600 bg-green-100'
      : lead.daiseeScore >= 50
      ? 'text-yellow-600 bg-yellow-100'
      : 'text-red-600 bg-red-100'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/leads')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{lead.name}</h1>
          <p className="text-gray-600 dark:text-gray-400">{lead.seniority} · {lead.company}</p>
        </div>
        <div className="ml-auto">
          <span className={`text-2xl font-bold px-4 py-2 rounded-lg ${scoreColor}`}>
            {lead.daiseeScore.toFixed(1)}
          </span>
          <p className="text-xs text-center text-gray-500 mt-1">DAISEE Score</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações do Lead</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{lead.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span>{lead.company}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <User className="w-4 h-4 text-gray-400" />
                <span>{lead.seniority}</span>
              </div>
              {lead.linkedinUrl && (
                <div className="flex items-center gap-2">
                  <Linkedin className="w-4 h-4 text-blue-500" />
                  <a
                    href={lead.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline truncate"
                  >
                    Ver perfil LinkedIn
                  </a>
                </div>
              )}
              <hr className="dark:border-gray-700" />
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="font-medium">{lead.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Prioridade</span>
                <span className={`font-medium ${lead.priority === 'ALTA' ? 'text-green-600' : lead.priority === 'MEDIA' ? 'text-yellow-600' : 'text-gray-500'}`}>
                  {lead.priority}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cadencia Section */}
        <div className="lg:col-span-2 space-y-4">
          {!lead.cadencia || lead.cadencia.status === 'DRAFT' ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Gerar Cadência com IA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tom da abordagem
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['CONSULTIVO', 'DIRETO', 'CRIATIVO'].map((tone) => (
                      <button
                        key={tone}
                        onClick={() => setSelectedTone(tone)}
                        className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                          selectedTone === tone
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                            : 'border-gray-200 dark:border-gray-700 hover:border-red-300'
                        }`}
                      >
                        {toneLabels[tone]}
                      </button>
                    ))}
                  </div>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button
                  onClick={handleGenerateCadencia}
                  disabled={generating}
                  className="w-full"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {generating ? 'Gerando com IA...' : 'Gerar Cadência'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Cadência Gerada — Tom {toneLabels[lead.cadencia.tone]}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateCadencia}
                    disabled={generating}
                  >
                    {generating ? 'Gerando...' : 'Regerar'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {lead.cadencia.touches.map((touch) => (
                  <div key={touch.id} className="border dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase">
                        Touch {touch.sequence} — {touchTypeLabels[touch.type] || touch.type}
                      </span>
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                        {touch.channel}
                      </span>
                    </div>
                    {touch.subject && (
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        Assunto: {touch.subject}
                      </p>
                    )}
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {touch.content}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
