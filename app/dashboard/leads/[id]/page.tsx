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
  updatedAt?: string
}

interface Cadencia {
  id: string
  tone: string
  status: string
  touches: Touch[]
  generatedAt?: string
  updatedAt?: string
}

interface Lead {
  id: string
  name: string
  email: string | null
  company: string
  seniority: string
  daiseeScore: number
  status: string
  priority: string
  excludedFromAutomation: boolean
  linkedinUrl?: string
  profileText?: string
  profileUrl?: string
  phone?: string
  notes?: string
  companyContext?: string
  companySize: string
  segmentMatch: number
  cadencia?: Cadencia
  createdAt: string
  updatedAt?: string
}

const toneLabels: Record<string, string> = {
  CONSULTIVO: 'Consultivo',
  DIRETO: 'Direto',
  CRIATIVO: 'Criativo',
}

const touchTypeLabels: Record<string, string> = {
  LINKEDIN_250: 'LinkedIn (200 chars)',
  LINKEDIN_500: 'LinkedIn (500 chars)',
  EMAIL_T3: 'E-mail T3',
  EMAIL_T4: 'E-mail T4',
  EMAIL_T5: 'E-mail T5',
}

const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

const formatMultiline = (value: string) => escapeHtml(value).replace(/\n/g, '<br />')

const buildCadenciaPrintHtml = (lead: Lead) => {
  const generatedAt = lead.cadencia?.generatedAt || lead.cadencia?.updatedAt

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Cadência - ${escapeHtml(lead.name)} - ${escapeHtml(lead.company)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px; color: #111827; font-family: Arial, Helvetica, sans-serif; line-height: 1.5; }
    .header { border-bottom: 2px solid #e5e7eb; margin-bottom: 24px; padding-bottom: 18px; }
    h1 { font-size: 26px; margin: 0 0 8px; }
    h2 { border-bottom: 1px solid #e5e7eb; font-size: 18px; margin: 28px 0 12px; padding-bottom: 6px; }
    .meta { color: #4b5563; font-size: 12px; margin-top: 6px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 24px; margin-top: 16px; }
    .field { font-size: 13px; }
    .label { color: #6b7280; display: block; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
    .touch { border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 14px; padding: 14px; page-break-inside: avoid; }
    .touch-title { align-items: center; display: flex; justify-content: space-between; gap: 16px; margin-bottom: 8px; }
    .touch-title strong { font-size: 13px; text-transform: uppercase; }
    .badge { background: #f3f4f6; border-radius: 999px; color: #374151; font-size: 11px; padding: 3px 8px; white-space: nowrap; }
    .subject { font-size: 13px; font-weight: 700; margin: 8px 0; }
    .content { color: #1f2937; font-size: 13px; }
    .notes { background: #f9fafb; border-radius: 8px; color: #374151; font-size: 12px; padding: 12px; }
    @media print { body { padding: 20mm; } }
  </style>
</head>
<body>
  <section class="header">
    <h1>Cadência - ${escapeHtml(lead.name)}</h1>
    <div class="meta">Dados sincronizados em ${escapeHtml(formatDateTime(new Date().toISOString()))}</div>
    <div class="meta">Cadência gerada em ${escapeHtml(formatDateTime(generatedAt))}</div>
    <div class="grid">
      <div class="field"><span class="label">Empresa</span>${escapeHtml(lead.company)}</div>
      <div class="field"><span class="label">Cargo</span>${escapeHtml(lead.seniority)}</div>
      <div class="field"><span class="label">E-mail</span>${escapeHtml(lead.email || '-')}</div>
      <div class="field"><span class="label">Telefone/WhatsApp</span>${escapeHtml(lead.phone || '-')}</div>
      <div class="field"><span class="label">Status</span>${escapeHtml(lead.status)}</div>
      <div class="field"><span class="label">Prioridade</span>${escapeHtml(lead.priority)}</div>
      <div class="field"><span class="label">Score DAISEE</span>${escapeHtml(lead.daiseeScore.toFixed(1))}</div>
      <div class="field"><span class="label">Tom</span>${escapeHtml(toneLabels[lead.cadencia?.tone || ''] || lead.cadencia?.tone || '-')}</div>
    </div>
  </section>
  ${lead.notes ? `<h2>Observações</h2><div class="notes">${formatMultiline(lead.notes)}</div>` : ''}
  ${lead.companyContext ? `<h2>Contexto da Empresa</h2><div class="notes">${formatMultiline(lead.companyContext)}</div>` : ''}
  <h2>Touches</h2>
  ${(lead.cadencia?.touches || []).map((touch) => `
    <article class="touch">
      <div class="touch-title">
        <strong>Touch ${escapeHtml(touch.sequence)} - ${escapeHtml(touchTypeLabels[touch.type] || touch.type)}</strong>
        <span class="badge">${escapeHtml(touch.channel)} · ${escapeHtml(touch.status)}</span>
      </div>
      ${touch.subject ? `<div class="subject">Assunto: ${escapeHtml(touch.subject)}</div>` : ''}
      <div class="content">${formatMultiline(touch.content)}</div>
    </article>
  `).join('')}
</body>
</html>`
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
  const [updatingTouchId, setUpdatingTouchId] = useState<string | null>(null)
  const [togglingAutomation, setTogglingAutomation] = useState(false)
  const [editingCompanyContext, setEditingCompanyContext] = useState(false)
  const [companyContextInput, setCompanyContextInput] = useState('')
  const [savingCompanyContext, setSavingCompanyContext] = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [editingCompany, setEditingCompany] = useState(false)
  const [companyInput, setCompanyInput] = useState('')
  const [savingCompany, setSavingCompany] = useState(false)
  const [editingSeniority, setEditingSeniority] = useState(false)
  const [seniorityInput, setSeniorityInput] = useState('')
  const [savingSeniority, setSavingSeniority] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [sendingTouchId, setSendingTouchId] = useState<string | null>(null)
  const [sendResult, setSendResult] = useState<Record<string, string>>({})

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

  const handleSendTouch = async (touch: Touch) => {
    const actionLabel = touch.type === 'LINKEDIN_250' ? 'o convite de conexão' : 'a mensagem'
    if (!confirm(`Isso vai enviar ${actionLabel} de verdade no LinkedIn agora, pro lead "${lead?.name}". Confirmar?`)) return
    setSendingTouchId(touch.id)
    try {
      const res = await fetch(`/api/touches/${touch.id}/send`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao enviar')
      const label =
        data.outcome === 'enviado' ? 'Enviado com sucesso.' :
        data.outcome === 'pulado' ? `Não enviado: ${data.reason}` :
        `Falhou: ${data.reason}`
      setSendResult(prev => ({ ...prev, [touch.id]: label }))
      await fetchLead()
    } catch (err) {
      setSendResult(prev => ({ ...prev, [touch.id]: err instanceof Error ? err.message : 'Erro ao enviar' }))
    } finally {
      setSendingTouchId(null)
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
      setUploadSuccess(`${data.message || 'Perfil extraído com sucesso!'} ${data.textLength} caracteres processados.`)
      await fetchLead()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar PDF')
    } finally {
      setUploadingPdf(false)
      e.target.value = ''
    }
  }

  const handleEnrich = async () => {
    setEnriching(true)
    setError('')
    setUploadSuccess('')
    try {
      const res = await fetch(`/api/leads/${params.id}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao enriquecer perfil')
      setUploadSuccess(`${data.message} ${data.textLength} caracteres importados.`)
      await fetchLead()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enriquecer perfil via LinkedIn')
    } finally {
      setEnriching(false)
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

  const handleSaveEmail = async () => {
    if (!lead) return
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailInput)) {
      setError('Formato de e-mail inválido')
      return
    }
    setSavingEmail(true)
    try {
      const res = await fetch(`/api/leads/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar')
      setEditingEmail(false)
      await fetchLead()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar e-mail')
    } finally {
      setSavingEmail(false)
    }
  }

  const saveField = async (field: string, value: string, setter: (v: boolean) => void, setSaving: (v: boolean) => void) => {
    if (!lead || !value.trim()) {
      setError(`${field} não pode ser vazio`)
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field.toLowerCase()]: value }),
      })
      if (!res.ok) throw new Error('Falha ao salvar')
      setter(false)
      await fetchLead()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Falha ao salvar ${field}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCompanyContext = async () => {
    if (!lead) return
    setSavingCompanyContext(true)
    try {
      const res = await fetch(`/api/leads/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyContext: companyContextInput }),
      })
      if (!res.ok) throw new Error('Falha ao salvar')
      setEditingCompanyContext(false)
      await fetchLead()
    } catch {
      setError('Falha ao salvar contexto da empresa')
    } finally {
      setSavingCompanyContext(false)
    }
  }

  const handleTouchStatusChange = async (touchId: string, newStatus: string) => {
    setUpdatingTouchId(touchId)
    try {
      await fetch(`/api/touches/${touchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      await fetchLead()
    } catch {
      setError('Falha ao atualizar status do touch')
    } finally {
      setUpdatingTouchId(null)
    }
  }

  const handleToggleAutomation = async () => {
    if (!lead) return
    setTogglingAutomation(true)
    try {
      await fetch(`/api/leads/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excludedFromAutomation: !lead.excludedFromAutomation }),
      })
      await fetchLead()
    } catch {
      setError('Falha ao atualizar automação')
    } finally {
      setTogglingAutomation(false)
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

  const handleDownloadCadenciaPdf = async () => {
    if (!lead?.cadencia) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      setError('Não foi possível abrir a janela do PDF. Verifique o bloqueador de pop-ups.')
      return
    }

    printWindow.document.write('<p style="font-family: Arial, sans-serif; padding: 24px;">Sincronizando dados do lead...</p>')
    setDownloadingPdf(true)
    setError('')

    try {
      const response = await fetch(`/api/leads/${params.id}?sync=${Date.now()}`, {
        cache: 'no-store',
      })
      const freshLead: Lead = await response.json()

      if (!response.ok) {
        throw new Error('Falha ao sincronizar dados do lead')
      }

      if (!freshLead.cadencia || freshLead.cadencia.touches.length === 0) {
        throw new Error('Este lead ainda não tem uma cadência pronta para PDF')
      }

      setLead(freshLead)
      printWindow.document.open()
      printWindow.document.write(buildCadenciaPrintHtml(freshLead))
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => printWindow.print(), 250)
    } catch (err) {
      printWindow.close()
      setError(err instanceof Error ? err.message : 'Falha ao gerar PDF da cadência')
    } finally {
      setDownloadingPdf(false)
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
        <div className="flex-1">
          {editingName ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Nome do lead"
                className="text-2xl font-bold border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600 w-full"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => saveField('name', nameInput, setEditingName, setSavingName)} disabled={savingName} className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
                  {savingName ? 'Salvando...' : 'Salvar'}
                </button>
                <button onClick={() => setEditingName(false)} className="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{lead.name}</h1>
                <button
                  onClick={() => { setEditingName(true); setNameInput(lead.name) }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Editar
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-400">{lead.seniority} · {lead.company}</p>
            </div>
          )}
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
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                {editingEmail ? (
                  <div className="flex flex-col gap-1 flex-1">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="email@empresa.com"
                      className="text-sm border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600 w-full"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleSaveEmail} disabled={savingEmail} className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
                        {savingEmail ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button onClick={() => setEditingEmail(false)} className="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`truncate ${lead.email ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 italic'}`}>
                      {lead.email || 'Sem e-mail cadastrado'}
                    </span>
                    <button
                      onClick={() => { setEditingEmail(true); setEmailInput(lead.email || '') }}
                      className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      Editar
                    </button>
                  </div>
                )}
              </div>
              {/* Company */}
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                {editingCompany ? (
                  <div className="flex flex-col gap-1 flex-1">
                    <input
                      type="text"
                      value={companyInput}
                      onChange={(e) => setCompanyInput(e.target.value)}
                      placeholder="Empresa"
                      className="text-sm border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600 w-full"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={() => saveField('company', companyInput, setEditingCompany, setSavingCompany)} disabled={savingCompany} className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
                        {savingCompany ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button onClick={() => setEditingCompany(false)} className="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-gray-700 dark:text-gray-300">{lead.company}</span>
                    <button
                      onClick={() => { setEditingCompany(true); setCompanyInput(lead.company) }}
                      className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      Editar
                    </button>
                  </div>
                )}
              </div>
              {/* Seniority */}
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                {editingSeniority ? (
                  <div className="flex flex-col gap-1 flex-1">
                    <input
                      type="text"
                      value={seniorityInput}
                      onChange={(e) => setSeniorityInput(e.target.value)}
                      placeholder="Cargo/Senioridade"
                      className="text-sm border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600 w-full"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={() => saveField('seniority', seniorityInput, setEditingSeniority, setSavingSeniority)} disabled={savingSeniority} className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
                        {savingSeniority ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button onClick={() => setEditingSeniority(false)} className="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-gray-700 dark:text-gray-300">{lead.seniority}</span>
                    <button
                      onClick={() => { setEditingSeniority(true); setSeniorityInput(lead.seniority) }}
                      className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      Editar
                    </button>
                  </div>
                )}
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
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Automação</span>
                <button
                  onClick={handleToggleAutomation}
                  disabled={togglingAutomation}
                  className={`text-xs px-3 py-1 rounded-full font-medium disabled:opacity-50 ${
                    lead.excludedFromAutomation
                      ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                  }`}
                  title="Clique para alternar se este lead entra no envio automático"
                >
                  {togglingAutomation ? 'Salvando...' : lead.excludedFromAutomation ? 'Excluído' : 'Ativo'}
                </button>
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
                Perfil LinkedIn
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
                  {uploadSuccess && (
                    <p className="text-xs text-green-600 dark:text-green-400">{uploadSuccess}</p>
                  )}
                  <div className="flex gap-2">
                    {lead.linkedinUrl && (
                      <button
                        onClick={handleEnrich}
                        disabled={enriching}
                        className="flex-1 flex items-center justify-center gap-1 text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        <Zap className="w-3 h-3" />
                        {enriching ? 'Enriquecendo...' : 'Atualizar via LinkedIn'}
                      </button>
                    )}
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
                  {uploadSuccess && (
                    <p className="text-xs text-green-600 dark:text-green-400">{uploadSuccess}</p>
                  )}
                  {lead.linkedinUrl ? (
                    <button
                      onClick={handleEnrich}
                      disabled={enriching}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      <Zap className="w-4 h-4" />
                      {enriching ? 'Buscando perfil no LinkedIn...' : 'Enriquecer via LinkedIn (automático)'}
                    </button>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Salve a URL do LinkedIn do lead para enriquecer automaticamente, ou use o upload de PDF abaixo.
                    </p>
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
              {error && (error.includes('PDF') || error.includes('LinkedIn') || error.includes('Unipile') || error.includes('enriquecer')) && (
                <p className="text-xs text-red-500">{error}</p>
              )}
            </CardContent>
          </Card>

          {/* Company Context */}
          <Card className={lead.companyContext ? 'border-purple-300 dark:border-purple-700' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Contexto da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {editingCompanyContext ? (
                <div className="space-y-2">
                  <textarea
                    value={companyContextInput}
                    onChange={(e) => setCompanyContextInput(e.target.value)}
                    placeholder="Cole aqui a análise do Sales Navigator ou qualquer contexto relevante sobre a empresa do lead (prioridades estratégicas, desafios, iniciativas recentes)..."
                    rows={8}
                    className="w-full text-sm border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-600 resize-y"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveCompanyContext}
                      disabled={savingCompanyContext}
                      className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                    >
                      {savingCompanyContext ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      onClick={() => setEditingCompanyContext(false)}
                      className="text-xs px-3 py-1.5 border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : lead.companyContext ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Contexto salvo — será usado na geração da cadência
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap line-clamp-4">
                    {lead.companyContext}
                  </p>
                  <button
                    onClick={() => { setEditingCompanyContext(true); setCompanyContextInput(lead.companyContext || '') }}
                    className="text-xs text-gray-400 hover:text-purple-600"
                  >
                    Editar contexto
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Busque automaticamente do LinkedIn ou cole a análise do Sales Navigator para que a IA use as prioridades e desafios da empresa na personalização das mensagens.
                  </p>
                  {lead.linkedinUrl && (
                    <button
                      onClick={handleEnrich}
                      disabled={enriching}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      <Building2 className="w-4 h-4" />
                      {enriching ? 'Buscando empresa no LinkedIn...' : 'Buscar contexto via LinkedIn'}
                    </button>
                  )}
                  <button
                    onClick={() => setEditingCompanyContext(true)}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg border-2 border-dashed border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/10 text-purple-600 text-sm transition-colors"
                  >
                    + Adicionar contexto manualmente
                  </button>
                </div>
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateCadencia}
                      disabled={generating}
                    >
                      {generating ? 'Gerando...' : 'Regerar'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadCadenciaPdf}
                      disabled={downloadingPdf || generating}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      {downloadingPdf ? 'Sincronizando...' : 'Baixar PDF'}
                    </Button>
                  </div>
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase">
                            Touch {touch.sequence} — {touchTypeLabels[touch.type] || touch.type}
                          </span>
                          <select
                            value={touch.status}
                            disabled={updatingTouchId === touch.id}
                            onChange={(e) => handleTouchStatusChange(touch.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded border font-medium cursor-pointer disabled:opacity-50 focus:outline-none transition-colors ${
                              touch.status === 'RESPONDIDO' ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700' :
                              touch.status === 'ENVIADO'    ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700' :
                              touch.status === 'ENTREGUE'   ? 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700' :
                              touch.status === 'FALHOU'     ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700' :
                              'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                            }`}
                          >
                            <option value="AGENDADO">Agendado</option>
                            <option value="ENVIADO">Enviado</option>
                            <option value="ENTREGUE">Entregue</option>
                            <option value="RESPONDIDO">Respondido</option>
                            <option value="FALHOU">Falhou</option>
                          </select>
                        </div>
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
                          {touch.channel === 'EMAIL' && lead.email && (
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
                          {touch.channel === 'LINKEDIN' && (touch.status === 'AGENDADO' || touch.status === 'FALHOU') && (
                            <button
                              onClick={() => handleSendTouch(touch)}
                              disabled={sendingTouchId === touch.id}
                              className="flex items-center gap-1 text-xs px-2 py-1 border border-sky-300 text-sky-700 dark:text-sky-400 rounded hover:bg-sky-50 dark:hover:bg-sky-900/20 disabled:opacity-50 transition-colors"
                            >
                              <Send className="w-3 h-3" />
                              {sendingTouchId === touch.id ? 'Enviando...' : 'Enviar agora'}
                            </button>
                          )}
                        </div>
                      </div>
                      {sendResult[touch.id] && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{sendResult[touch.id]}</p>
                      )}
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
