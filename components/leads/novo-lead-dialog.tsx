'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, X } from 'lucide-react'

interface Props {
  aberto: boolean
  onFechar: () => void
  /** Chamado com o id do lead recém-criado. */
  onCriado: (leadId: string, aviso?: string) => void
}

const PORTES: { valor: string; label: string }[] = [
  { valor: 'MICRO', label: 'Micro (1-9)' },
  { valor: 'PEQUENA', label: 'Pequena (10-49)' },
  { valor: 'MEDIA', label: 'Média (50-249)' },
  { valor: 'GRANDE', label: 'Grande (250-499)' },
  { valor: 'ENTERPRISE', label: 'Enterprise (500+)' },
]

const VAZIO = {
  name: '',
  company: '',
  seniority: '',
  companySize: 'MEDIA',
  email: '',
  phone: '',
  linkedinUrl: '',
  notes: '',
}

export function NovoLeadDialog({ aberto, onFechar, onCriado }: Props) {
  const [form, setForm] = useState(VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (aberto) {
      setForm(VAZIO)
      setErro('')
    }
  }, [aberto])

  useEffect(() => {
    if (!aberto) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aberto, onFechar])

  if (!aberto) return null

  const set = (campo: keyof typeof VAZIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (salvando) return

    setSalvando(true)
    setErro('')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.error || 'Falha ao criar o lead.')
        return
      }
      onCriado(data.id, data.aviso)
    } catch {
      setErro('Falha ao criar o lead.')
    } finally {
      setSalvando(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
      onClick={onFechar}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-card border border-border shadow-xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Novo lead</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Para o contato que aparece no meio de uma conversa. Nome, empresa e cargo bastam — o
              resto dá para completar depois.
            </p>
          </div>
          <button
            onClick={onFechar}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input required value={form.name} onChange={set('name')} className={inputClass} placeholder="Ana Ribeiro" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Empresa <span className="text-red-500">*</span>
              </label>
              <input required value={form.company} onChange={set('company')} className={inputClass} placeholder="Banco XP" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cargo <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.seniority}
                onChange={set('seniority')}
                className={inputClass}
                placeholder="Diretora de Compliance"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Porte da empresa
            </label>
            <select value={form.companySize} onChange={set('companySize')} className={inputClass}>
              {PORTES.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              O DAISEE Score sai do cargo e do porte — dá para ajustar na ficha depois.
            </p>
          </div>

          <div className="pt-1 border-t border-border">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mt-4 mb-3">
              Canais de contato (opcionais)
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    className={inputClass}
                    placeholder="ana@empresa.com.br"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input value={form.phone} onChange={set('phone')} className={inputClass} placeholder="(11) 99999-0000" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">LinkedIn</label>
                <input
                  value={form.linkedinUrl}
                  onChange={set('linkedinUrl')}
                  className={inputClass}
                  placeholder="https://www.linkedin.com/in/..."
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contexto
            </label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={3}
              className={inputClass}
              placeholder="De onde veio o contato, o que foi dito, o que ficou combinado."
            />
          </div>

          {erro && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {erro}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onFechar} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {salvando ? 'Salvando…' : 'Salvar e abrir ficha'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
