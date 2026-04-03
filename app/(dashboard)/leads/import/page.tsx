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
        setError('Please select a CSV file')
        setFile(null)
        return
      }
      setError('')
      setFile(selectedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      setError('Please select a file')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/leads/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import leads')
      }

      setSuccess(
        `Successfully imported ${data.imported} leads. ${
          data.duplicates > 0 ? `${data.duplicates} duplicates skipped.` : ''
        }`
      )
      setFile(null)

      // Redirect to leads page after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/leads')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Import Leads
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Upload a CSV file to import leads and calculate DAISEE scores
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Import Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Select a CSV file with columns: name, email, company, seniority
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* File Input */}
                <div className="border-2 border-dashed border-input rounded-lg p-12 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                  <label htmlFor="file-input" className="cursor-pointer block">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">
                      {file ? file.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      CSV files only (max 10MB)
                    </p>
                  </label>
                  <input
                    id="file-input"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800 dark:text-red-200">
                      {error}
                    </p>
                  </div>
                )}

                {/* Success Message */}
                {success && (
                  <div className="flex gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-800 dark:text-green-200">
                      {success}
                    </p>
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={!file || loading}
                    className="flex-1"
                  >
                    {loading ? 'Importing...' : 'Import Leads'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* CSV Format Guide */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">CSV Format</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-mono text-sm bg-muted p-3 rounded mb-2">
                  name,email,company,seniority
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2 text-gray-900 dark:text-white">
                  Example:
                </h4>
                <div className="font-mono text-xs bg-muted p-3 rounded space-y-1">
                  <p>João Silva,joao@empresa.com,Tech Inc,VP</p>
                  <p>Maria Santos,maria@empresa.com,Finance Co,Director</p>
                  <p>Pedro Costa,pedro@empresa.com,Sales Ltd,Manager</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2 text-gray-900 dark:text-white">
                  Column Details:
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  <li>
                    <strong>name</strong> - Contact's full name (required)
                  </li>
                  <li>
                    <strong>email</strong> - Contact's email address (required)
                  </li>
                  <li>
                    <strong>company</strong> - Company name (required)
                  </li>
                  <li>
                    <strong>seniority</strong> - Job title/level (required)
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What Happens Next</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex gap-3">
                <span className="font-bold text-primary-600 dark:text-primary-400 flex-shrink-0">
                  1.
                </span>
                <span>DAISEE scores are calculated automatically</span>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-primary-600 dark:text-primary-400 flex-shrink-0">
                  2.
                </span>
                <span>Leads are added to your pipeline</span>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-primary-600 dark:text-primary-400 flex-shrink-0">
                  3.
                </span>
                <span>You can upload LinkedIn profiles to generate cadencias</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
