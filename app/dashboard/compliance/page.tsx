'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, AlertTriangle, CheckCircle2 } from 'lucide-react'

export default function CompliancePage() {
  const [message, setMessage] = useState('')
  const [selectedRegulation, setSelectedRegulation] = useState('LGPD')
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean
    regulation: string
    score: number
    violations: Array<{
      type: string
      severity: string
      message: string
    }>
    summary: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const regulations = [
    { id: 'LINKEDIN_250', name: 'LinkedIn T1', description: 'Mensagem de conexão (até 200 chars)', icon: '💬' },
    { id: 'LINKEDIN_500', name: 'LinkedIn 500', description: 'InMail / mensagem direta (até 600 chars)', icon: '📨' },
    { id: 'EMAIL_T3',     name: 'E-mail',       description: 'Corpo de e-mail de prospecção', icon: '✉️' },
  ]

  const handleValidate = async () => {
    if (!message.trim()) {
      setValidationResult({
        isValid: false,
        regulation: selectedRegulation,
        score: 0,
        violations: [
          {
            type: 'error',
            severity: 'critical',
            message: 'A mensagem não pode estar vazia',
          },
        ],
        summary: 'A mensagem é obrigatória',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/compliance/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          regulation: selectedRegulation,
        }),
      })

      const data = await response.json()
      setValidationResult(data)
    } catch (error) {
      setValidationResult({
        isValid: false,
        regulation: selectedRegulation,
        score: 0,
        violations: [
          {
            type: 'error',
            severity: 'critical',
            message: 'Falha ao validar a mensagem',
          },
        ],
        summary: 'Erro ao validar',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Análise de Qualidade de Copy
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Avalie suas mensagens de prospecção B2B antes de enviar
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Validation Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Validar Mensagem</CardTitle>
              <CardDescription>
                Cole qualquer mensagem e veja pontos de melhoria antes de enviar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Regulation Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Selecione a Regulação
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {regulations.map((reg) => (
                    <button
                      key={reg.id}
                      onClick={() => setSelectedRegulation(reg.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedRegulation === reg.id
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-red-300'
                      }`}
                    >
                      <span className="text-xl mb-2 block">{reg.icon}</span>
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">
                        {reg.name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {reg.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Texto da Mensagem
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Cole sua mensagem aqui..."
                  className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 min-h-32 resize-none bg-white dark:bg-gray-800"
                />
              </div>

              {/* Validation Result */}
              {validationResult && (
                <div className="space-y-4">
                  {/* Score Card */}
                  <div
                    className={`p-4 rounded-lg border-l-4 ${
                      validationResult.isValid
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex gap-3">
                        {validationResult.isValid ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                            <span className="font-semibold text-green-800 dark:text-green-200">
                              Mensagem em conformidade
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                            <span className="font-semibold text-red-800 dark:text-red-200">
                              {validationResult.violations.length} violation
                              {validationResult.violations.length !== 1
                                ? 's'
                                : ''}{' '}
                              found
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {validationResult.score}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Score de Compliance
                        </div>
                      </div>
                    </div>

                    {validationResult.violations.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                          Problemas
                        </div>
                        <ul className="space-y-2">
                          {validationResult.violations.map((violation, idx) => (
                            <li
                              key={idx}
                              className="text-sm flex gap-2 items-start"
                            >
                              <div
                                className={`flex-shrink-0 w-4 h-4 rounded mt-0.5 ${
                                  violation.severity === 'critical'
                                    ? 'bg-red-500'
                                    : 'bg-yellow-500'
                                }`}
                              />
                              <div className="flex-1 text-gray-700 dark:text-gray-300">
                                {violation.message}
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {violation.type} ({violation.severity})
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleValidate}
                disabled={loading || !message.trim()}
                className="w-full"
              >
                {loading ? 'Analisando...' : 'Analisar Copy'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Regulations Guide */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Requisitos
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🚫 O que evitar</h4>
                <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Palavras de spam (grátis, urgente, clique agora)</li>
                  <li>• Tom agressivo (você precisa, última chance)</li>
                  <li>• Múltiplas perguntas na mesma mensagem</li>
                  <li>• Superlativas sem evidência (melhor, número 1)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">✅ O que ter</h4>
                <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Nome, empresa ou cargo do prospect</li>
                  <li>• Proposta de valor clara</li>
                  <li>• Uma pergunta ou CTA único</li>
                  <li>• Tamanho adequado ao canal</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">📊 Score</h4>
                <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• <strong>70–100</strong> → Copy aprovada</li>
                  <li>• <strong>Crítico</strong> → -25 pts (spam, tamanho)</li>
                  <li>• <strong>Aviso</strong> → -10 pts (tom, CTA, valor)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
