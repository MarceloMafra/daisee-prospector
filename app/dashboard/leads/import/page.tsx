'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function ImportLeadsPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Por favor, selecione um arquivo CSV')
        setFile(null)
        return
      }
      setError('')
      setFile(selectedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { setError('Por favor, selecione um arquivo'); return }
    setLoading(true); setError(''); setSuccess('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/leads/import', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Falha ao importar leads')
      let msg = `Total: ${data.total} | Importados: ${data.imported} | Duplicatas: ${data.duplicates} | Erros: ${data.errors?.length ?? 0}`
      if (data.errors?.length > 0) {
        msg += '\n\nErros:\n' + data.errors.map((e: {row: number; email: string; error: string}) => `Linha ${e.row} (${e.email}): ${e.error}`).join('\n')
      }
      setSuccess(msg)
      setFile(null)
      if (data.imported > 0) setTimeout(() => router.push('/dashboard/leads'), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Importar Leads</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Faça upload de um CSV para importar leads e calcular os scores DAISEE</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Upload do Arquivo CSV</CardTitle>
              <CardDescription>Colunas: name, email, company, seniority, linkedin (opcional)</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <label htmlFor="file-input" className="cursor-pointer block">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">{file ? file.name : 'Clique para selecionar ou arraste o arquivo'}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Somente arquivos CSV (máx. 10MB)</p>
                  </label>
                  <input id="file-input" type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                </div>
                {error && (
                  <div className="flex gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                  </div>
                )}
                {success && (
                  <div className="flex gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <pre className="text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap font-sans">{success}</pre>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button type="submit" disabled={!file || loading} className="flex-1">{loading ? 'Importando...' : 'Importar Leads'}</Button>
                  <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>Cancelar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Formato do CSV</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="font-mono text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded">name,email,company,seniority,linkedin</p>
              <div>
                <h4 className="font-semibold text-sm mb-2">Exemplo:</h4>
                <div className="font-mono text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded space-y-1">
                  <p>João Silva,joao@empresa.com,Tech Inc,VP,linkedin.com/in/joao</p>
                  <p>Maria Santos,maria@empresa.com,Finance Co,Diretora,</p>
                </div>
              </div>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li><strong>name</strong> — nome completo (obrigatório)</li>
                <li><strong>email</strong> — e-mail único (obrigatório)</li>
                <li><strong>company</strong> — empresa (obrigatório)</li>
                <li><strong>seniority</strong> — cargo/nível (obrigatório)</li>
                <li><strong>linkedin</strong> — URL do perfil (opcional)</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">O que acontece depois</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex gap-3"><span className="font-bold text-red-600">1.</span><span>Score DAISEE calculado automaticamente</span></div>
              <div className="flex gap-3"><span className="font-bold text-red-600">2.</span><span>Leads adicionados ao pipeline</span></div>
              <div className="flex gap-3"><span className="font-bold text-red-600">3.</span><span>Clique em "Ver" para gerar cadências com IA</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
