'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Key } from 'lucide-react'
import { useState } from 'react'

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSaveApiKey = () => {
    // In a real app, this would save to the database or secure storage
    if (apiKey) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Configure your application
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              API Keys
            </CardTitle>
            <CardDescription>
              Manage your integration keys
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                API keys are stored securely and never shared. Keep them confidential.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Claude API Key
              </label>
              <div className="flex gap-2">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800"
                />
                <Button
                  variant="outline"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </Button>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Get your key from:{' '}
                <a
                  href="https://console.anthropic.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-600 dark:text-red-400 hover:underline"
                >
                  console.anthropic.com
                </a>
              </p>
            </div>

            <Button onClick={handleSaveApiKey} className="w-full">
              {saved ? '✓ Saved' : 'Save API Key'}
            </Button>
          </CardContent>
        </Card>

        {/* Database Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Database</CardTitle>
            <CardDescription>
              Database configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold">Status:</span> Connected
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                <span className="font-semibold">Provider:</span> Neon PostgreSQL
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>
              Application preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Email notifications
              </span>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Analytics
              </span>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
