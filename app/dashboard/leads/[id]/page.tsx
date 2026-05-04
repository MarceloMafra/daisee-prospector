'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Linkedin, Mail, Building2, User, Zap, MessageSquare, Upload, FileText, Trash2, CheckCircle2, Shield, AlertTriangle, Send, Phone, StickyNote } from 'lucide-react'

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
  profileText?: string
  profileUrl?: string
  phone?: string
  notes?: string
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
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [editingLinkedin, setEditingLinkedin] = useState(false)
  const [linkedinInput, setLinkedinInput] = useState('')
  const [savingLinkedin, setSavingLinkedin] = useState(false)
  const [complianceResults, setComplianceResults] = useState<Record<string, { isValid: boolean; score: number; violations: Array<{ severity: string; message: string }> }>>({})
  const [validatingId, setValidatingId] = useState<string | null>(null)
  const [editingPhone, setEditingPhone] = useState(false)
  const [phoneInput, setPhoneInput] = useState('')
  const [savingPhone, setSavingPhone] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesInput, setNotesInput] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const handleValidateTouch = async (touch: Touch) => {
    setValidatingId(touch.id)
    try {
      const res = await fetch('/api/compliance/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: touch.content, regulation: touch.type }),
      })
      const data = await res.json()
      setComplianceResults(prev => ({ ...prev, [touch.id]: data }))
    } catch {
      // ignore
    } finally {
      setValidatingId(null)
    }
  }

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

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Por favor, selecione um arquivo PDF')
      return
    }
    setUploadingPdf(true)
    setError('')
    setUploadSuccess('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/leads/${params.id}/profile`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao enviar PDF')
      setUploadSuccess(`Perfil extraído com sucesso! ${data.textLength} caracteres processados.`)
      await fetchLead()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar PDF')
    } finally {
      setUploadingPdf(false)
      e.target.value = ''
    }
  }

  const handleRemoveProfile = async () => {
    try {
      await fetch(`/api/leads/${params.id}/profile`, { method: 'DELETE' })
      setUploadSuccess('')
      await fetchLead()
    } catch {
      setError('Falha ao remover perfil')
    }
  }

  const handleSaveLinkedin = async () => {
    if (!lead) return
    setSavingLinkedin(true)
    try {
      const res = await fetch(`/api/leads/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedinUrl: linkedinInput }),
      })
      if (!res.ok) throw new Error('Falha ao salvar')
      setEditingLinkedin(false)
      await fetchLead()
    } catch {
      setError('Falha ao salvar URL do LinkedIn')
    } finally {
      setSavingLinkedin(false)
    }
  }

  const handleSavePhone = async () => {
    if (!lead) return
    setSavingPhone(true)
    try {
      const res = await fetch(`/api/leads/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput }),
      })
      if (!res.ok) throw new Error('Falha ao salvar')
      setEditingPhone(false)
      await fetchLead()
    } catch {
      setError('Falha ao salvar telefone')
    } finally {
      setSavingPhone(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!lead) return
    setSavingNotes(true)
    try {
      const res = await fetch(`/api/leads/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesInput }),
      })
      if (!res.ok) throw new Error('Falha ao salvar')
      setEditingNotes(false)
      await fetchLead()
    } catch {
      setError('Falha ao salvar observações')
    } finally {
      setSavingNotes(false)
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

      if (!genRes.ok) {
        const errData = await genRes.json().catch(() => ({}))
        throw new Error(errData.error || 'Generation failed')
      }

      await fetchLead()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao gerar cadência. Tente novamente.')
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
              <div className="flex items-start gap-2">
                <Linkedin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                {lead.linkedinUrl ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate text-sm">
                      Ver perfil LinkedIn
                    </a>
                    <button
                      onClick={() => { setEditingLinkedin(true); setLinkedinInput(lead.linkedinUrl || '') }}
                      className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      Editar
                    </button>
                  </div>
                ) : editingLinkedin ? (
                  <div className="flex flex-col gap-1 flex-1">
                    <input
                      type="url"
                      value={linkedinInput}
                      onChange={(e) => setLinkedinInput(e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                      className="text-sm border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600 w-full"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveLinkedin}
                        disabled={savingLinkedin}
                        className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                      >
                        {savingLinkedin ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        onClick={() => setEditingLinkedin(false)}
                        className="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingLinkedin(true)}
                    className="text-sm text-gray-400 hover:text-blue-500 italic"
                  >
                    + Adicionar URL do LinkedIn
                  </button>
                )}
              </div>
              {editingLinkedin && lead.linkedinUrl && (
                <div className="flex flex-col gap-1 pl-6">
                  <input
                    type="url"
                    value={linkedinInput}
                    onChange={(e) => setLinkedinInput(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="text-sm border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600 w-full"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveLinkedin}
                      disabled={savingLinkedin}
                      className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                      {savingLinkedin ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      onClick={() => setEditingLinkedin(false)}
                      className="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              {/* Phone / WhatsApp */}
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                {lead.phone ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline text-sm">
                      {lead.phone}
                    </a>
                    <button
                      onClick={() => { setEditingPhone(true); setPhoneInput(lead.phone || '') }}
                      className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      Editar
                    </button>
                  </div>
                ) : editingPhone ? (
                  <div className="flex flex-col gap-1 flex-1">
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="+55 11 99999-9999"
                      className="text-sm border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600 w-full"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleSavePhone} disabled={savingPhone} className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
                        {savingPhone ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button onClick={() => setEditingPhone(false)} className="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setEditingPhone(true)} className="text-sm text-gray-400 hover:text-green-600 italic">
                    + Adicionar WhatsApp/Telefone
                  </button>
                )}
              </div>
              {editingPhone && lead.phone && (
                <div className="flex flex-col gap-1 pl-6">
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+55 11 99999-9999"
                    className="text-sm border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600 w-full"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSavePhone} disabled={savingPhone} className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
                      {savingPhone ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button onClick={() => setEditingPhone(false)} className="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                      Cancelar
                    </button>
                  </div>
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

              <hr className="dark:border-gray-700" />

              {/* Observações */}
              <div className="flex items-start gap-2">
                <StickyNote className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                {editingNotes ? (
                  <div className="flex flex-col gap-1 flex-1">
                    <textarea
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      placeholder="Adicione observações sobre este lead..."
                      rows={3}
                      className="text-sm border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600 w-full resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleSaveNotes} disabled={savingNotes} className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
                        {savingNotes ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button onClick={() => setEditingNotes(false)} className="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : lead.notes ? (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{lead.notes}</p>
                    <button
                      onClick={() => { setEditingNotes(true); setNotesInput(lead.notes || '') }}
                      className="text-xs text-gray-400 hover:text-gray-600 mt-1"
                    >
                      Editar
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setEditingNotes(true)} className="text-sm text-gray-400 hover:text-yellow-600 italic">
                    + Adicionar observações
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* LinkedIn PDF Upload */}
          <Card className={lead.profileText ? 'border-green-300 dark:border-green-700' : 'border-orange-300 dark:border-orange-700'}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Perfil LinkedIn (PDF)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.profileText ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Perfil carregado</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {lead.profileUrl && `Arquivo: ${lead.profileUrl}`}
                    <br />
                    {lead.profileText.length} caracteres extraídos
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded line-clamp-3">
                    {lead.profileText.substring(0, 150)}...
                  </p>
                  <div className="flex gap-2">
                    <label className="flex-1 cursor-pointer">
                      <span className="flex items-center justify-center gap-1 text-xs px-3 py-1.5 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <Upload className="w-3 h-3" />
                        {uploadingPdf ? 'Enviando...' : 'Substituir PDF'}
                      </span>
                      <input type="file" accept=".pdf" onChange={handlePdfUpload} className="hidden" disabled={uploadingPdf} />
                    </label>
                    <button
                      onClick={handleRemoveProfile}
                      className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                    ⚠️ Sem perfil — cadência será genérica
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Exporte o PDF do LinkedIn e faça upload para gerar mensagens altamente personalizadas.
                  </p>
                  {uploadSuccess && (
                    <p className="text-xs text-green-600 dark:text-green-400">{uploadSuccess}</p>
                  )}
                  <label className="block cursor-pointer">
                    <span className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed text-sm transition-colors ${uploadingPdf ? 'opacity-50' : 'border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/10 text-orange-600'}`}>
                      <Upload className="w-4 h-4" />
                      {uploadingPdf ? 'Processando PDF...' : 'Upload PDF do LinkedIn'}
                    </span>
                    <input type="file" accept=".pdf" onChange={handlePdfUpload} className="hidden" disabled={uploadingPdf} />
                  </label>
                </div>
              )}
              {error && error.includes('PDF') && (
                <p className="text-xs text-red-500">{error}</p>
              )}
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
                {/* Copy quality info */}
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                  <Shield className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  Clique em <strong className="text-gray-700 dark:text-gray-300">Qualidade</strong> em cada touch para analisar spam, tom, personalização, CTA e tamanho.
                </div>

                {lead.cadencia.touches.map((touch) => {
                  const result = complianceResults[touch.id]
                  return (
                    <div key={touch.id} className="border dark:border-gray-700 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase">
                          Touch {touch.sequence} — {touchTypeLabels[touch.type] || touch.type}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                            {touch.channel}
                          </span>
                          <button
                            onClick={() => handleValidateTouch(touch)}
                            disabled={validatingId === touch.id}
                            className="flex items-center gap-1 text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                          >
                            <Shield className="w-3 h-3" />
                            {validatingId === touch.id ? 'Analisando...' : 'Qualidade'}
                          </button>
                          {touch.channel === 'EMAIL' && (
                            <a
                              href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(lead.email)}&su=${encodeURIComponent(touch.subject || '')}&body=${encodeURIComponent(touch.content)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs px-2 py-1 border border-blue-300 text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                              <Send className="w-3 h-3" />
                              Gmail
                            </a>
                          )}
                        </div>
                      </div>
                      {touch.subject && (
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Assunto: {touch.subject}
                        </p>
                      )}
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {touch.content}
                      </p>
                      {result && (
                        <div className={`rounded-lg p-3 text-xs border-l-4 ${result.isValid ? 'bg-green-50 dark:bg-green-900/20 border-green-500' : 'bg-red-50 dark:bg-red-900/20 border-red-500'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5 font-semibold">
                              {result.isValid
                                ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /><span className="text-green-700 dark:text-green-300">Copy aprovada</span></>
                                : <><AlertTriangle className="w-3.5 h-3.5 text-red-600" /><span className="text-red-700 dark:text-red-300">{result.violations.length} ponto(s) de melhoria</span></>
                              }
                            </div>
                            <span className="font-bold text-gray-700 dark:text-gray-300">Score {result.score}/100</span>
                          </div>
                          {result.violations.length > 0 && (
                            <ul className="space-y-1 mt-2">
                              {result.violations.map((v, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-gray-700 dark:text-gray-300">
                                  <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${v.severity === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                                  {v.message}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
