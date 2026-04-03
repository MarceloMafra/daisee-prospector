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
    issues: string[]
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const regulations = [
    {
      id: 'LGPD',
      name: 'LGPD',
      description: 'Lei Geral de Proteção de Dados (Brazil)',
      icon: '🛡️',
    },
    {
      id: 'PHARMA',
      name: 'ANVISA',
      description: 'Agência Nacional de Vigilância Sanitária',
      icon: '💊',
    },
    {
      id: 'INSURANCE',
      name: 'SUSEP',
      description: 'Superintendência de Seguros Privados',
      icon: '📋',
    },
    {
      id: 'CONAR',
      name: 'CONAR',
      description: 'Código de Autodisciplina da Publicidade',
      icon: '📢',
    },
  ]

  const handleValidate = async () => {
    if (!message.trim()) {
      setValidationResult({
        isValid: false,
        issues: ['Message cannot be empty'],
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
        issues: ['Failed to validate message'],
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
          Compliance Validator
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Validate your messages against Brazilian regulatory requirements
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Validation Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Validate Message</CardTitle>
              <CardDescription>
                Check your message for compliance violations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Regulation Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Select Regulation
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {regulations.map((reg) => (
                    <button
                      key={reg.id}
                      onClick={() => setSelectedRegulation(reg.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedRegulation === reg.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-input hover:border-primary-300'
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
                  Message Text
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Paste your message here..."
                  className="w-full p-4 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-32 resize-none"
                />
              </div>

              {/* Validation Result */}
              {validationResult && (
                <div
                  className={`p-4 rounded-lg border-l-4 ${
                    validationResult.isValid
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                  }`}
                >
                  <div className="flex gap-3 mb-3">
                    {validationResult.isValid ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <span className="font-semibold text-green-800 dark:text-green-200">
                          Message is compliant
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                        <span className="font-semibold text-red-800 dark:text-red-200">
                          {validationResult.issues.length} issue
                          {validationResult.issues.length !== 1 ? 's' : ''} found
                        </span>
                      </>
                    )}
                  </div>

                  {validationResult.issues.length > 0 && (
                    <ul className="space-y-2">
                      {validationResult.issues.map((issue, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-red-800 dark:text-red-200 flex gap-2"
                        >
                          <span className="text-red-600 dark:text-red-400">•</span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleValidate}
                disabled={loading || !message.trim()}
                className="w-full"
              >
                {loading ? 'Validating...' : 'Validate Message'}
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
                  Requirements
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  LGPD
                </h4>
                <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• No personal data without consent</li>
                  <li>• Clear identification of sender</li>
                  <li>• Opt-out option required</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  ANVISA
                </h4>
                <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• No false health claims</li>
                  <li>• Professional language only</li>
                  <li>• Required disclaimers</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  SUSEP
                </h4>
                <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Clear policy details</li>
                  <li>• No misleading rates</li>
                  <li>• Company registration visible</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  CONAR
                </h4>
                <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Truthful advertising</li>
                  <li>• No inappropriate language</li>
                  <li>• Respect consumer dignity</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
